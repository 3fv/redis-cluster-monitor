import Redis from "ioredis"
import util from "util"
import moment from "moment"
import { assign, bind, defaultsDeep } from "lodash"
import Tracer from "tracer"
import EventEmitter from "events"
import chalk from "chalk"
import { RedisClusterMonitorFilter } from "./RedisClusterMonitorFilter"

// @ts-ignore
const commandLog = Tracer.colorConsole({
    format: "{{message}}",
  }),
  log = Tracer.colorConsole()

export type RedisClusterMonitorHandler = (
  time: number,
  cmd: string,
  args: any[],
  source: string,
  database: string
) => any

export interface RedisClusterMonitorOptions extends Redis.ClusterOptions {
  /**
   * Override default logging handler with something else, up to u
   */
  onCommand?: RedisClusterMonitorHandler

  commands?:Array<keyof Redis.Commands>

  filters?: RedisClusterMonitorFilter[]
}

const onCommandDefault: RedisClusterMonitorHandler = (
  time,
  cmd,
  args,
  source,
  _database
) => {
  const timestamp = moment(new Date(Math.floor(time * 1000))).format()
  process.stdout.write(`${chalk.blueBright(timestamp) + " " + chalk.greenBright(`[${source}]`)}  ${chalk.bold.yellow(cmd)} ` + util.inspect(args) + "\n")
}

/**
 * Monitor a redis cluster (all-nodes)
 * 
 * Filter commands, log commands as JSON, etc, etc
 */
export class RedisClusterMonitor {
  readonly onCommand: RedisClusterMonitorHandler

  readonly commands:Array<keyof Redis.Commands>

  readonly filters: RedisClusterMonitorFilter[]

  readonly clusterPromise: Promise<Redis.Cluster>

  /**
   * Cluster connection
   */
  cluster: Redis.Cluster
  
  /**
   * `all` nodes in the cluster
   */
  nodes: Redis.Redis[]

  /**
   * Monitor references returned by `redis.monitor`
   */
  monitors: EventEmitter[]

  private processCommand(
    time: number,
    args: any[],
    source: string,
    database: string
  ) {
    const cmd = args[0]
    args = args.slice(1)

    const isEnabled = !this.filters || this.filters.every(filter => filter(time,cmd,args,source,database))
    if (isEnabled) {
      this.onCommand(time,cmd,args,source,database)
    }
  }
  
  private nodeHandler(node: Redis.Redis): Promise<EventEmitter> {
    return node.monitor().then((monitor) => {
      monitor.on("monitor", bind(this.processCommand, this))
      return monitor
    })
  
  }

  async start() {
    this.cluster = await this.clusterPromise
    this.nodes = this.cluster.nodes()
    this.monitors = await Promise.all(
      this.nodes.map(bind(this.nodeHandler,this))
    )
  }

  async stop() {
    log.info("Received SIGINT. Exiting")
    const { cluster, nodes, monitors } = this

    // Untyped disconnect from docs (its really just an event emitter, so its assumed this function will go away, hence the guard)
    monitors
      .filter((it: any) => typeof it.disconnect === "function")
      .map((it: any) => it.disconnect())

    // Disconnect all nodes manually
    nodes.forEach((node) => node.disconnect(false))

    // Quit the cluster
    await cluster.quit()
  }

  constructor(
    readonly configEndpoint: string,
    readonly options: RedisClusterMonitorOptions = {}
  ) {
    const { onCommand = onCommandDefault, filters = [], commands = [], ...redisClusterOptions } =
      defaultsDeep(options, {
        maxRedirections: 64,
        redisOptions: {
          enableOfflineQueue: false,
          enableReadyCheck: true,
          showFriendlyErrorStack: true,
          reconnectOnError: (err) =>
            ["READONLY", "MOVED"].some((code) => err.message.startsWith(code)),
          ...(options.redisOptions ?? {}),
        },
      })
    
      assign(this, {
        onCommand,
        commands, 
        filters
      })
    
    this.clusterPromise = new Promise<Redis.Cluster>((resolve, reject) => {
      const conn = new Redis.Cluster([configEndpoint], redisClusterOptions)

      conn.once("error", reject)
      conn.on("ready", () => {
        console.log(`Connection ready`)
        conn.off("error", reject)
        resolve(conn)
      })
    })
  }
}
