import type { GoproxyConsole, GoproxyEnv, GoproxyOptions } from "./types.ts";

export function goproxyConsole(
  env: GoproxyEnv,
  options: GoproxyOptions,
): GoproxyConsole {
  const result = options.console ?? console;
  const verbose =
    options.verbose ?? (env.GOSUB_VERBOSE && env.GOSUB_VERBOSE !== "0");
  return verbose
    ? result
    : {
        info() {},
        log() {},
        warn(obj) {
          return result.warn(obj);
        },
        error(obj) {
          return result.error(obj);
        },
      };
}
