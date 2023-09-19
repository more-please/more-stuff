import { removeOptionalPrefix, removePrefix } from "./utils";

import type { GoproxyConfig } from "./goproxy";
import { goproxy } from "./goproxy";

export function gosubEncode(config: GoproxyConfig): string {
  const { base, repo, directory, tagPrefix, tagSuffix } = config;
  const path = removePrefix(
    "github.com",
    removeOptionalPrefix("https://", repo),
  );
  if (!path) {
    throw new Error("Only github.com URLs are supported");
  }
  const [_, ghOwner, ghRepo, ghExtra] = path.split("/");
  if (!ghOwner || !ghRepo || ghExtra) {
    throw new Error("Repo URL must be https://github.com/[owner]/[repo]");
  }
  const params = new URLSearchParams();
  if (directory) {
    params.set("d", directory);
  }
  if (tagPrefix) {
    params.set("p", tagPrefix);
  }
  if (tagSuffix) {
    params.set("s", tagSuffix);
  }
  return `${base ?? ""}/github.com${path}${params.size ? `:${params}` : ""};`;
}

export function gosubDecode(
  path?: string,
  base?: string,
): GoproxyConfig | undefined {
  if (base && base !== "/") {
    path = removePrefix(base, path);
  }
  if (!path) {
    return;
  }
  const [spec] = path.split(";");
  if (!spec) {
    return;
  }
  const [url, args] = spec.split(":");
  if (!url) {
    return;
  }
  const [_, host, owner, repo, extra] = url.split("/");
  if (_ || host !== "github.com" || !owner || !repo || extra) {
    return;
  }
  const config: GoproxyConfig = {
    base,
    repo: `https://${host}/${owner}/${repo}`,
  };
  if (args) {
    const params = new URLSearchParams(args);
    config.directory = params.get("d") ?? undefined;
    config.tagPrefix = params.get("p") ?? undefined;
    config.tagSuffix = params.get("s") ?? undefined;
  }
  return config;
}

export type GosubConfig = {
  base: string;
  goproxy: typeof goproxy;
};

export function gosub(
  config: Partial<GosubConfig> = {},
): (request: Request) => Promise<Response | undefined> {
  const args: GosubConfig = {
    base: "/",
    goproxy,
    ...config,
  };
  return async (request: Request) => {
    const url = new URL(request.url);
    const config = gosubDecode(url.pathname, args.base);
    if (!config) {
      return;
    }
    return args.goproxy(config)(request);
  };
}
