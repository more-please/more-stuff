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
    Deno: undefined | { env?: { getObject?(): GoproxyEnv } };
  };
  const global: Global = globalThis as any;
  return global.process?.env ?? global.Deno?.env?.getObject?.() ?? {};
}

export function goproxy(
  base: string,
  config: GoproxyConfig,
  env: GoproxyEnv = goproxyEnv(),
): (request: string | Request) => Promise<Response | undefined> {
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

  return async (request: string | Request) => {
    const url =
      typeof request === "string" ? request : new URL(request.url).pathname;
    const path = removePrefix(base, url);
    if (!path) {
      return;
    }
    const cmdStart = path.lastIndexOf("@");
    if (cmdStart < 0) {
      return;
    }
    const module = path.substring(0, cmdStart - 1);
    if (config.module && config.module !== module) {
      return;
    }

    const API = "https://api.github.com";
    const NEXT_LINK = /(?<=<)([\S]*)(?=>; rel="Next")/i;

    async function githubFetch(
      path: string,
      extraHeaders: Record<string, string> = {},
    ): Promise<Response> {
      const url = new URL(path, API);
      const headers = new Headers({
        "User-Agent": "gosub-goproxy",
        "X-GitHub-Api-Version": "2022-11-28",
      });
      if (env.GITHUB_TOKEN) {
        headers.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
      }
      for (const [k, v] of Object.entries(extraHeaders)) {
        headers.set(k, v);
      }
      const response = await fetch(url.href, { headers });
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

    try {
      const cmd = path.substring(cmdStart);

      if (cmd === "@gosub/rate_limit") {
        const result = await githubFetch("/rate_limit");
        return Response.json(await result.json());
      }

      if (cmd === "@v/list" || cmd === "@gosub/tags") {
        const results: string[] = [];
        for await (const page of githubPaginate(
          `/repos/${owner}/${repo}/tags`,
        )) {
          const tags = (await page.json()) as github.Tags;
          for (const tag of tags) {
            const v = cmd === "@v/list" ? tagToVersion(tag.name) : tag.name;
            if (v) {
              results.push(`${v}\n`);
            }
          }
        }
        return new Response(results.join(""), { headers: textHeaders });
      }

      const v = removePrefix("@v/v", cmd);
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
        // Find subdirectories with nested go.mod files
        const nestedModules = metadata
          .map((m) => removeSuffix("/go.mod", m.name))
          .filter(isDefined);
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

      return new Response("Not found", { status: 404 });
    } catch (err) {
      if (err instanceof Response) {
        return err;
      }
      return new Response(`${err}`, { status: 500 });
    }
  };
}
