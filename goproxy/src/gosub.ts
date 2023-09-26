import {
  ensurePrefix,
  ensureSuffix,
  removeOptionalPrefix,
  removeOptionalSuffix,
  removePrefix,
} from "./utils.ts";
import { type GoproxyConfig, goproxy } from "./goproxy.ts";

export function gosubEncode(config: GoproxyConfig): string {
  const { url: repo, directory, tagPrefix, tagSuffix } = config;
  const path = removePrefix(
    "github.com/",
    removeOptionalPrefix("https://", removeOptionalSuffix("/", repo)),
  );
  if (!path) {
    throw new Error("Only github.com URLs are supported");
  }
  const [ghOwner, ghRepo, ghExtra] = path.split("/");
  if (!ghOwner || !ghRepo || ghExtra !== undefined) {
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
  return `github.com/${path}${params.size ? `:${params}` : ""};`;
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
    config.directory = params.get("d") ?? undefined;
    config.tagPrefix = params.get("p") ?? undefined;
    config.tagSuffix = params.get("s") ?? undefined;
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
