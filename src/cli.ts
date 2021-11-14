import Tracer from "tracer"
import "./cli-complete"
import * as Yargs from "yargs"
import { RedisClusterMonitor } from "./RedisClusterMonitor"
import {
  commandMonitorFilter,
  RedisClusterMonitorFilter,
  regexMonitorFilter
} from "./RedisClusterMonitorFilter"
import type { RedisClusterMonitorOutputFormat } from "./RedisClusterMonitorOptions"
import type { RedisCommand } from "./RedisCommand"

const log = Tracer.colorConsole()
async function run() {
  const argv = await Promise.resolve(
    Yargs.scriptName("redis-cluster-monitor")
      .usage(
        "$0 [options]",
        "Monitor all redis cluster commands across all nodes."
      )
      .option("format", {
        alias: ["t"],
        desc: "Command/argument filters as regex or a simple string",
        choices: ["text", "json"] as RedisClusterMonitorOutputFormat[],
        default: "text" as RedisClusterMonitorOutputFormat,
        type: "string"
      })
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
      })
      .option("clusterConfigEndpoint", {
        alias: ["h", "endpoint", "host"],
        desc: "Redis cluster config endpoint. example my-elastic-cache.amazonaws.com:6379",
        string: true,
        demandOption: true
      })
      .help().argv
  )

  const {
    clusterConfigEndpoint,
    filter: filterArgs,
    format: outputFormat,
    command: commandArgs
  } = argv

  const filters: Array<RedisClusterMonitorFilter> = [
    ...filterArgs.map(regexMonitorFilter),
    ...commandArgs.map(commandMonitorFilter)
  ]
  const monitor = new RedisClusterMonitor(clusterConfigEndpoint, {
    filters,
    outputFormat
  })

  await monitor.start()
  process.stdin.resume()

  process.on("SIGINT", async () => {
    await monitor.stop()
    process.exit(0)
  })
}

run().catch(err => log.error(`failed`, err))
