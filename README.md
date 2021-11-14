# `redis-cluster-monitor`

Monitor any Redis cluster, greatly simplifying development with Redis.

While most of the redis desktop tools as well as `redis-cli` support the
`monitor` command, none of the tools subscribe to all `nodes` (`masters` &
`slaves`).

Depending on how well you understand Redis `cluster-mode`, you likely are quick
to realize that without executing `monitor` on all `nodes` and then merging the
data to a shared stream, debugging consistency & locking is a bit difficult.
Well, problem solved, `redis-cluster-monitor` is here.

It uses `ioredis` `Cluster` client under the covers and has an API as well as
CLI entry & OOB works with Amazon AWS `Elasticache`.

## Quick Start

```shell
npm i -g @3fv/redis-cluster-monitor

# Only required option is `host` or `clusterConfigEndpoint` (aliases)
# Which is a config endpoint for your redis cluster

# LOG FORMAT
redis-cluster-monitor --host my-elastic-cache-config.amazonaws.com:6379

>> 2021-11-13T22:03:17-05:00 [172.0.12.116:51565] info [ 'all' ]

# JSON FORMAT
redis-cluster-monitor --format json --host my-elastic-cache-config.amazonaws.com:6379

>> {"timestamp":"2021-11-13T21:52:07-05:00","epoch":1636858327969,"cmd":"info","args":["all"],"source":"172.0.12.116:51565","database":"0"}
```

## Extras

A few nice to have extras.

- Regex filtering of commands, keys & values
- Output `log` or `json` format (`json` is really `jsonl`, which is an Object
  per line)

## Examples

```shell

# filters are regex compiled, so make sure to escape any values provided
redis-cluster-monitor --host my-elastic-cache-config.amazonaws.com:6379 --filter info

# same as
redis-cluster-monitor --host my-elastic-cache-config.amazonaws.com:6379 --filter ".*info.*"

```

```shell
# Example of JSON format, filtering for `info`
redis-cluster-monitor -t json --filter info --host my-elastic-cache-config.amazonaws.com:6379

>> {"timestamp":"2021-11-13T22:07:17-05:00","epoch":1636859237962,"cmd":"info","args":["all"],"source":"172.0.12.116:51565","database":"0"}
>> {"timestamp":"2021-11-13T22:07:27-05:00","epoch":1636859247962,"cmd":"info","args":["all"],"source":"172.0.12.116:51565","database":"0"}
>> {"timestamp":"2021-11-13T22:07:37-05:00","epoch":1636859257963,"cmd":"info","args":["all"],"source":"172.0.12.116:51565","database":"0"}

```

# API

Checkout [RedisClusterMonitorOptions](./src/RedisClusterMonitorOptions.ts) for
all options. Here is a quick example of the CLI example above.

```typescript
import {
  RedisClusterMonitor,
  regexMonitorFilter
} from "@3fv/redis-cluster-monitor"

const monitor = new RedisClusterMonitor(
  "my-elastic-cache-config.amazonaws.com:6379",
  {
    filters: [regexMonitorFilter(/info/)],
    outputFormat: "json"
  }
)

monitor.start().then(() => {
  console.log("Monitoring all nodes")
})
```
