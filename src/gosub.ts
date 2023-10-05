import {
  ensurePrefix,
  ensureSuffix,
  removeOptionalPrefix,
  removeOptionalSuffix,
  removePrefix,
} from "./utils.ts";
import { type GoproxyConfig, goproxy } from "./goproxy.ts";

const DEFAULTS: Partial<GoproxyConfig> = {
  directory: "",
  module: "",
  tagPrefix: "v",
  tagSuffix: "",
};

export function gosubEncode(config: GoproxyConfig): string {
  config = { ...DEFAULTS, ...config };
  const path = removePrefix(
    "github.com/",
    removeOptionalPrefix("https://", removeOptionalSuffix("/", config.url)),
  );
  if (!path) {
    throw new Error("Only github.com URLs are supported");
  }
  const [ghOwner, ghRepo, ghExtra] = path.split("/");
  if (!ghOwner || !ghRepo || ghExtra !== undefined) {
    throw new Error("Repo URL must be https://github.com/[owner]/[repo]");
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
  return `github.com/${path}${paramStr ? `:${paramStr}` : ""};`;
}

export function gosubDecode(path: string): GoproxyConfig | undefined {
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
  return config;
}

export type GosubConfig = {
  goproxy: typeof goproxy;
};

export function gosub(
  base: string = "/",
  config: Partial<GosubConfig> = {},
): (request: Request) => Promise<Response | undefined> {
  const args: GosubConfig = {
    goproxy,
    ...config,
  };
  base = ensurePrefix("/", ensureSuffix("/", base));
  return async (request: Request) => {
    const url = new URL(request.url);
    const subpath = removePrefix(base, url.pathname);
    const config = subpath && gosubDecode(subpath);
    if (!config) {
      return;
    }
    const base2 = gosubEncode(config);
    const handler = args.goproxy(`${base}${base2}/`, config);
    return handler(request);
  };
}
