import type { GoproxyConfig, GoproxyEnv, GoproxyOptions } from "./types.ts";
import { goproxy, goproxyEnv } from "./goproxy.ts";
import { goproxyConsole } from "./logging.ts";
import { Result, err, ok } from "./result.ts";
import {
  ensurePrefix,
  ensureSuffix,
  removeOptionalPrefix,
  removeOptionalSuffix,
  removePrefix,
} from "./utils.ts";

const DEFAULTS: Partial<GoproxyConfig> = {
  directory: "",
  module: "",
  tagPrefix: "v",
  tagSuffix: "",
};

// Expose dependencies to allow mocking in tests
export const deps = {
  goproxy,
};

export function gosubEncode(config: GoproxyConfig): Result<string> {
  config = { ...DEFAULTS, ...config };
  const domain = removePrefix(
    "github.com/",
    removeOptionalPrefix("https://", config.url),
  );
  if (domain === undefined) {
    return err("Repo URL must be on github.com");
  }
  const path = removeOptionalSuffix("/", domain);
  const [ghOwner, ghRepo, ghExtra] = path.split("/");
  if (!ghOwner || !ghRepo || ghExtra !== undefined) {
    return err("Repo URL must be github.com/[owner]/[repo]");
  }
  const params = new URLSearchParams("");
  function maybeSet<K extends keyof GoproxyConfig>(param: string, key: K) {
    const value = config[key];
    if (value !== undefined && value !== DEFAULTS[key]) {
      params.set(param, value);
    }
  }
  maybeSet("d", "directory");
  maybeSet("m", "module");
  maybeSet("p", "tagPrefix");
  maybeSet("s", "tagSuffix");
  const paramStr = params.toString();
  return ok(`github.com/${path}${paramStr ? `:${paramStr}` : ""};`);
}

export type GosubDecode = {
  config: GoproxyConfig;
  used: string;
};

export function gosubDecode(path: string): GosubDecode | undefined {
  const [spec] = path.split(";");
  if (!spec) {
    return;
  }
  const [url, args] = spec.split(":");
  if (!url) {
    return;
  }
  const [host, owner, repo, extra] = url.split("/");
  if (host !== "github.com" || !owner || !repo || extra !== undefined) {
    return;
  }
  const config: GoproxyConfig = {
    url: `https://${host}/${owner}/${repo}`,
  };
  if (args) {
    const params = new URLSearchParams(args);
    function maybeSet<K extends keyof GoproxyConfig>(param: string, key: K) {
      const value = params.get(param) ?? undefined;
      if (value !== undefined && value !== DEFAULTS[key]) {
        config[key] = value;
      }
    }
    maybeSet("d", "directory");
    maybeSet("m", "module");
    maybeSet("p", "tagPrefix");
    maybeSet("s", "tagSuffix");
  }
  return {
    config,
    used: `${spec};`,
  };
}

export function gosub(
  base: string = "/",
  env: GoproxyEnv = goproxyEnv(),
  options: GoproxyOptions = {},
): (request: Request) => Promise<Response | undefined> {
  const console = goproxyConsole(env, options);
  base = ensurePrefix("/", ensureSuffix("/", base));
  console.log({ message: "gosub init", base });
  return async (request: Request) => {
    const url = new URL(request.url);
    const subpath = removePrefix(base, url.pathname);
    const decode = subpath && gosubDecode(subpath);
    console.log({ message: "gosub request", url, subpath, decode });
    if (!decode) {
      return;
    }
    const handler = deps.goproxy(
      `${base}${decode.used}/`,
      decode.config,
      env,
      options,
    );
    return handler(request);
  };
}
