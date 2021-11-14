import * as Yargs from "yargs"
import { RedisClusterMonitor } from "./RedisClusterMonitor"
import Tracer from "tracer"
import {
  commandMonitorFilter,
  regexMonitorFilter
} from "./RedisClusterMonitorFilter"
import type { RedisCommand } from "./RedisCommand"
import { RedisClusterMonitorFilter } from "."

const log = Tracer.colorConsole()
async function run() {
  const argv = await Promise.resolve(
    Yargs.scriptName("redis-cluster-monitor")
      .usage(
        "$0 [options]",
        "Monitor all redis cluster commands across all nodes."
      )

      .option("filter", {
        alias: ["f"],
        desc: "Command/argument filters as regex or a simple string",
        array: true,
        default: [],
        type: "string"
      })
      .option("command", {
        alias: ["c", "cmd"],
        desc: "One or more redis commands to filter for",
        array: true,
        default: [] as RedisCommand[]
        // type: "string"
      })
      .option("clusterConfigEndpoint", {
        alias: ["h", "endpoint", "host"],
        desc: "Redis cluster config endpoint. example my-elastic-cache.amazonaws.com:6379",
        // type: "string",
        string: true,
        demandOption: true
      })
      .help().argv
  )

  const {
    clusterConfigEndpoint,
    filter: filterArgs,
    command: commandArgs
  } = argv

  const filters: Array<RedisClusterMonitorFilter> = [
    ...filterArgs.map(regexMonitorFilter),
    ...commandArgs.map(commandMonitorFilter)
  ]
  const monitor = new RedisClusterMonitor(clusterConfigEndpoint, {
    filters,
    commands: commandArgs
  })

  await monitor.start()
  process.stdin.resume()

  process.on("SIGINT", async () => {
    await monitor.stop()
    process.exit(0)
  })
}

run().catch(err => log.error(`failed`, err))
