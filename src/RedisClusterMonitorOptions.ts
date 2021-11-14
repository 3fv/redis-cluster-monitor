
import type Redis from "ioredis"
import { RedisClusterMonitorFilter } from "./RedisClusterMonitorFilter"

export type RedisClusterMonitorOutputFormat = "text" | "json"

export type RedisClusterMonitorHandler = (
  options: RedisClusterMonitorOptions,
  time: number,
  cmd: string,
  args: any[],
  source: string,
  database: string
) => any


export interface RedisClusterMonitorHandlerOptions {
  filters?: RedisClusterMonitorFilter[]

  outputFormat?: RedisClusterMonitorOutputFormat
}

export interface RedisClusterMonitorOptions extends Redis.ClusterOptions, RedisClusterMonitorHandlerOptions {
  /**
   * Override default logging handler with something else, up to u
   */
  onCommand?: RedisClusterMonitorHandler


  
}