
import Redis from "ioredis"
import util from "util"
import moment from "moment"
import { defaultsDeep } from "lodash"
import Tracer from "tracer"
import EventEmitter from "events"

const log = Tracer.colorConsole()

export type RedisClusterMonitorHandler = (time: number, args:any[], source: string, database: string) => any

export interface RedisClusterMonitorOptions extends Redis.ClusterOptions {
  /**
   * Override default logging handler with something else, up to u
   */
  onCommand?: RedisClusterMonitorHandler
}

const onCommandDefault: RedisClusterMonitorHandler =  (time, args, source, _database) => {
  const timestamp = moment(new Date(Math.floor(time * 1000))).format()
  
  log.info(`(${timestamp}) [${source}]`, util.inspect(args))
}

export class RedisClusterMonitor {

  readonly onCommand: RedisClusterMonitorHandler

  readonly clusterPromise: Promise<Redis.Cluster>

  nodes: Redis.Redis[]
  cluster: Redis.Cluster
  monitors: EventEmitter[]

  async start() {
    this.cluster = await this.clusterPromise
    this.nodes = this.cluster.nodes()
    this.monitors = await Promise.all(
      this.nodes.map((node, i) =>
        node.monitor().then(monitor => {
          monitor.on("monitor", this.onCommand)
          return monitor
        })
      )
    )
  }

  async stop() {
    log.info("Received SIGINT. Exiting")
    const {cluster, nodes, monitors} = this
    
    // Untyped disconnect from docs (its really just an event emitter, so its assumed this function will go away, hence the guard)
    monitors.filter((it: any) => typeof it.disconnect === "function").map((it: any) => it.disconnect())
    
    // Disconnect all nodes manually
    nodes.forEach(node => node.disconnect(false))
    
    // Quit the cluster
    await cluster.quit()
    
  }

  constructor(
    readonly configEndpoint: string,
    readonly options: RedisClusterMonitorOptions = {}
  ) {
    const {onCommand = onCommandDefault, ...redisClusterOptions} = defaultsDeep(options,{
      maxRedirections: 64,
      redisOptions: {
        enableOfflineQueue: false,
        enableReadyCheck: true,
        showFriendlyErrorStack: true,
        reconnectOnError: err =>
          ["READONLY", "MOVED"].some(code => err.message.startsWith(code)),
          ...(options.redisOptions ?? {})
      }
    })
    
    this.onCommand = onCommand
    
    this.clusterPromise = new Promise<Redis.Cluster>((resolve,reject) => {
      const conn = new Redis.Cluster([configEndpoint], redisClusterOptions)
      
      conn.once("error", reject)
      conn.on(
        "ready",
        () => {
          console.log(`Connection ready`)
          conn.off("error", reject)
          resolve(conn)
        }
      )
    })
  }
}
