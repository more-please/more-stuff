import * as github from "./github.ts";

import {
  ensurePrefix,
  ensureSuffix,
  isDefined,
  removePrefix,
  removeSuffix,
} from "./utils.ts";

import { downloadZip } from "client-zip";

const textHeaders = {
  "content-type": "text/plain; charset=utf-8",
};

export type GoproxyEnv = Record<string, string | undefined> & {
  GITHUB_TOKEN?: string;
  GOSUB_VERBOSE?: string;
};

export type GoproxyLogObj = Record<string, any> & {
  message: string;
};

export type GoproxyConsole = {
  info: (obj: GoproxyLogObj) => void;
  log: (obj: GoproxyLogObj) => void;
  warn: (obj: GoproxyLogObj) => void;
  error: (obj: GoproxyLogObj) => void;
};

export type GoproxyConfig = {
  url: string; // Git repo URL - currently only Github is supported
  module?: string; // If set, Go module is required to match this
  directory?: string; // Subdirectory within the git repo
  tagPrefix?: string; // Prefix for version tags in git (default is "v")
  tagSuffix?: string; // Suffix for version tags in git
};

export function goproxyEnv(): GoproxyEnv {
  // Assume that process.env or Deno.env are usable if they exist.
  // They may or may not be declared, so work locally to avoid any
  // fiddly TypeScript declaration clashes.
  type Global = {
    process: undefined | { env?: GoproxyEnv };
    Deno: undefined | { env?: { toObject?(): GoproxyEnv } };
  };
  const global: Global = globalThis as any;
  return global.process?.env ?? global.Deno?.env?.toObject?.() ?? {};
}

export type GoproxyOptions = {
  console?: GoproxyConsole;
  verbose?: boolean;
};

function noop() {}

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
        info: noop,
        log: noop,
        warn(obj) {
          return result.warn(obj);
        },
        error(obj) {
          return result.error(obj);
        },
      };
}

export function goproxy(
  base: string,
  config: GoproxyConfig,
  env: GoproxyEnv = goproxyEnv(),
  options: GoproxyOptions = {},
): (request: string | Request) => Promise<Response | undefined> {
  const console = goproxyConsole(env, options);
  console.log({ message: "goproxy init", config, env });
  const url = new URL(config.url);
  if (url.hostname !== "github.com") {
    throw new Error("Only github.com URLs are supported");
  }
  const [_, owner, repo, extra] = url.pathname.split("/");
  if (!owner || !repo || extra) {
    throw new Error("Repo URL must be https://github.com/[owner]/[repo]");
  }

  base = ensurePrefix("/", ensureSuffix("/", base));
  const prefix = config.tagPrefix ?? "v";
  const suffix = config.tagSuffix ?? "";

  function tagToVersion(str: string): string | undefined {
    const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
    const v = removePrefix(prefix, removeSuffix(suffix, str));
    if (v && v.match(VERSION)) {
      return `v${v}`;
    } else {
      return undefined;
    }
  }

  const { GITHUB_TOKEN } = env;
  const API = "https://api.github.com";
  const NEXT_LINK = /(?<=<)([\S]*)(?=>; rel="Next")/i;

  async function githubFetch(
    path: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    console.log({ message: "github fetch", path, extraHeaders });
    const url = new URL(path, API);
    const headers = new Headers({
      "User-Agent": "gosub-goproxy",
      "X-GitHub-Api-Version": "2022-11-28",
    });
    if (GITHUB_TOKEN) {
      headers.set("Authorization", `Bearer ${GITHUB_TOKEN}`);
    }
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
    const response = await fetch(url.href, { headers });
    const { status, statusText } = response;
    console.log({ message: "fetch", url: response.url, status, statusText });
    if (!response.ok) {
      throw response;
    }
    return response;
  }

  async function* githubPaginate(url: string): AsyncGenerator<Response> {
    while (url) {
      const response = await githubFetch(url);
      const link = response.headers.get("link");
      yield response;
      url = (link && link.match(NEXT_LINK)?.[0]) ?? "";
    }
  }

  return async (request: string | Request) => {
    const url =
      typeof request === "string" ? request : new URL(request.url).pathname;
    console.log({ message: "goproxy request", url });
    const path = removePrefix(base, url);
    if (!path) {
      console.info({ message: "url doesn't match base", url, base });
      return;
    }
    const cmdStart = path.lastIndexOf("@");
    if (cmdStart < 0) {
      console.info({ message: "path has no @ command", path });
      return;
    }
    const module = path.substring(0, cmdStart - 1);
    if (config.module && config.module !== module) {
      console.info({ message: "module doesn't match config", module, config });
      return;
    }

    try {
      const command = path.substring(cmdStart);
      console.info({ message: "goproxy command", command });

      if (command === "@gosub/rate_limit") {
        const result = await githubFetch("/rate_limit");
        return Response.json(await result.json());
      }

      if (command === "@v/list" || command === "@gosub/tags") {
        const results: string[] = [];
        for await (const page of githubPaginate(
          `/repos/${owner}/${repo}/tags`,
        )) {
          const tags = (await page.json()) as github.Tags;
          for (const tag of tags) {
            const v = command === "@v/list" ? tagToVersion(tag.name) : tag.name;
            if (v) {
              results.push(`${v}\n`);
            }
          }
        }
        return new Response(results.join(""), { headers: textHeaders });
      }

      const v = removePrefix("@v/v", command);
      const info = removeSuffix(".info", v);
      if (info) {
        const refData = await githubFetch(
          `/repos/${owner}/${repo}/git/ref/tags/${prefix}${info}${suffix}`,
        );
        const ref = (await refData.json()) as github.Ref;
        const tagData = await githubFetch(ref.object.url);
        if (!tagData.ok) {
          throw new Error(tagData.statusText);
        }
        const tag = (await tagData.json()) as github.Tag;
        const result = {
          Version: `v${info}`,
          Time: tag.tagger.date,
        };
        return Response.json(result);
      }

      const mod = removeSuffix(".mod", v);
      if (mod) {
        const path = config.directory ? `${config.directory}/go.mod` : "go.mod";
        const result = await githubFetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${prefix}${mod}${suffix}/${path}`,
        );
        const text = await result.text();
        return new Response(text, { headers: textHeaders });
      }

      const zip = removeSuffix(".zip", v);
      if (module && zip) {
        // Get tag SHA
        const refData = await githubFetch(
          `/repos/${owner}/${repo}/git/ref/tags/${prefix}${zip}${suffix}`,
        );
        const ref = (await refData.json()) as github.Ref;
        // Get subdirectory tree
        const dir = config.directory ?? "";
        const treeData = await githubFetch(
          `/repos/${owner}/${repo}/git/trees/${ref.object.sha}:${dir}?recursive=1`,
        );
        if (!treeData.ok) {
          throw new Error(treeData.statusText);
        }
        console.info({ message: "goproxy treeData", treeData });
        // Extract the metadata we care about
        const metadata = ((await treeData.json()) as github.Tree).tree
          .filter(github.isBlob)
          // Results are probably sorted by path already, but just in case...
          .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
          .map((i) => ({
            name: i.path,
            size: i.size,
            url: i.url,
          }));
        console.info({ message: "goproxy metadata", metadata });
        // Find subdirectories with nested go.mod files
        const nestedModules = metadata
          .map((m) => removeSuffix("/go.mod", m.name))
          .filter(isDefined);
        console.info({ message: "goproxy nestedModules", nestedModules });
        // Build zip file
        async function* data() {
          nextFile: for (const m of metadata) {
            // Skip contents of nested modules
            for (const n of nestedModules) {
              if (m.name.startsWith(n)) {
                continue nextFile;
              }
            }
            const input = await githubFetch(m.url, {
              Accept: "application/vnd.github.v3.raw",
            });
            yield {
              name: `${module}@v${zip}/${m.name}`,
              input,
            };
          }
        }
        return downloadZip(data(), { metadata });
      }

      console.warn({ message: "unknown goproxy command", command });
      return new Response("Not found", { status: 404 });
    } catch (error) {
      if (error instanceof Response) {
        const { status, statusText } = error;
        console.warn({ message: "goproxy error response", status, statusText });
        return error;
      }
      console.error({ message: "goproxy internal error", error });
      return new Response(`${error}`, { status: 500 });
    }
  };
}
