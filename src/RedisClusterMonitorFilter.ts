import { flatten, isString, toLower } from "lodash"
import type { RedisCommand } from "./RedisCommand"


export type RedisClusterMonitorFilter = (
  time: number,
  cmd: string,
  args: any[],
  source: string,
  database: string
) => boolean


export function regexMonitorFilter(pattern: RegExp | string, flags: string = "i"):RedisClusterMonitorFilter {
  const exp: RegExp = isString(pattern) ? new RegExp(pattern,flags) : pattern

  return (
    time: number,
    cmd: string,
    args: any[],
    source: string,
    database: string
  ) => {
    return [cmd,...args.map(toString)].some(str => exp.test(str))
  }
}


export function commandMonitorFilter(allCmds:RedisCommand | Array<RedisCommand> ):RedisClusterMonitorFilter {
  const cmds = flatten([allCmds]).map(toLower)

  return (
    time: number,
    cmd: string,
    args: any[],
    source: string,
    database: string
  ) => {
    return cmds.includes(cmd.toLowerCase())
  }
  
}