import * as Yargs from "yargs"
import { RedisClusterMonitor } from "./RedisClusterMonitor"
import Tracer from "tracer"

const log = Tracer.colorConsole()
async function run() {
  const argv = await Promise.resolve(
    Yargs.scriptName("redis-cluster-monitor")
      .usage<{ clusterConfigEndpoint: string }>(
        "$0 <clusterConfigEndpoint>",
        "Monitor all redis cluster commands across all nodes.",
        (yargs) =>
          yargs.positional("clusterConfigEndpoint", {
            aliases: ["endpoint"],
            desc: "Redis cluster config endpoint. example my-elastic-cache.amazonaws.com:6379",
            // type: "string",
            string: true,
            demandOption: true,
          }) as Yargs.Argv<{
            clusterConfigEndpoint: string
          }>
      )
      .help().argv
  )

  const clusterConfigEndpoint = argv.clusterConfigEndpoint as string
  const monitor = new RedisClusterMonitor(clusterConfigEndpoint)

  await monitor.start()
  process.stdin.resume()

  process.on("SIGINT", async () => {
    await monitor.stop()
    process.exit(0)
  })
}

run().catch((err) => log.error(`failed`, err))
