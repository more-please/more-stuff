import * as github from "./github.ts";

import { removePrefix, removeSuffix } from "./utils.ts";

import { downloadZip } from "client-zip";
import { parse } from "valibot";

const headers = {
  "User-Agent": "gosub-goproxy",
};

const textHeaders = {
  "content-type": "text/plain; charset=utf-8",
};

export type GoproxyConfig = {
  base?: string; // Base path for server

  repo: string; // Git repo URL - currently only Github is supported
  directory?: string; // Subdirectory within the git repo
  tagPrefix?: string; // Prefix for version tags in git
  tagSuffix?: string; // Suffix for version tags in git
};

export function goproxy(
  config: GoproxyConfig,
): (request: Request) => Promise<Response | undefined> {
  const url = new URL(config.repo);
  if (url.hostname !== "github.com") {
    throw new Error("Only github.com URLs are supported");
  }
  const [_, owner, repo, extra] = url.pathname.split("/");
  if (!owner || !repo || extra) {
    throw new Error("Repo URL must be https://github.com/[owner]/[repo]");
  }

  const base = config.base ?? "/";
  const prefix = config.tagPrefix ?? "";
  const suffix = config.tagSuffix ?? "";

  type Version = { major: number; minor: number; patch: number };

  function encodeVersion(v: Version) {
    return `${prefix}v${v.major}.${v.minor}.${v.patch}${suffix}`;
  }

  function decodeVersion(str: string): Version | undefined {
    const VERSION = /^v(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)$/;
    const v = removePrefix(prefix, removeSuffix(suffix, str));
    const g = v && v.match(VERSION)?.groups;
    if (!g) {
      return;
    }
    return {
      major: parseInt(g.major!),
      minor: parseInt(g.minor!),
      patch: parseInt(g.patch!),
    };
  }

  return async (request: Request) => {
    const url = new URL(request.url);
    const path = removePrefix(base, url.pathname);
    if (!path) {
      return;
    }
    const cmdStart = path.indexOf("@");
    if (cmdStart < 0) {
      return;
    }

    const { signal, abort } = new AbortController();

    const cmd = path.substring(cmdStart);
    const v = removePrefix(`@v/`, cmd);
    if (v === "list") {
      let stream = new ReadableStream({
        async start(controller) {
          for await (const page of github.paginate(
            `${github.API}/repos/${owner}/${repo}/tags`,
            { signal, headers },
          )) {
            const json = await page.text();
            const tags = parse(github.Tags, JSON.parse(json));
            for (const tag of tags) {
              const v = decodeVersion(tag.name);
              if (v) {
                controller.enqueue(`v${v.major}.${v.minor}.${v.patch}\n`);
              }
            }
          }
          controller.close();
        },
        cancel(e) {
          abort(e);
        },
      });
      if (typeof TextEncoderStream === "function") {
        // Explicitly encode output as text - required by Deno
        stream = stream.pipeThrough(new TextEncoderStream());
      } else {
        // No TextEncoderStream, send raw output - required by Bun
      }
      return new Response(stream, { headers: textHeaders });
    }

    const info = removeSuffix(".info", v);
    if (info) {
      const refData = await fetch(
        `${github.API}/repos/${owner}/${repo}/git/ref/tags/${prefix}${info}${suffix}`,
        { signal, headers },
      );
      const ref = parse(github.Ref, await refData.json());
      const tagData = await fetch(ref.object.url, { headers });
      const tag = parse(github.Tag, await tagData.json());
      const result = {
        Version: info,
        Time: tag.tagger.date,
      };
      return Response.json(result);
    }

    const mod = removeSuffix(".mod", v);
    if (mod) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${prefix}${mod}${suffix}/go.mod`;
      const result = await fetch(url, { signal, headers });
      const text = await result.text();
      return new Response(text, { headers: textHeaders });
    }

    const zip = removeSuffix(".zip", v);
    if (zip) {
      // Get tag SHA
      const refData = await fetch(
        `${github.API}/repos/${owner}/${repo}/git/ref/tags/${prefix}${zip}${suffix}`,
        { signal, headers },
      );
      const ref = parse(github.Ref, await refData.json());
      // Get subdirectory tree
      const dir = config.directory ?? "";
      const treeData = await fetch(
        `${github.API}/repos/${owner}/${repo}/git/trees/${ref.object.sha}:${dir}?recursive=1`,
        { signal, headers },
      );
      // Extract the metadata we care about
      const metadata = parse(github.Tree, await treeData.json())
        .tree.filter(github.isBlob)
        // Results are probably sorted by path already, but just in case...
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
        .map((i) => ({
          name: i.path,
          size: i.size,
          url: i.url,
        }));
      // TODO: skip subdirectories containing nested go.mod files
      // Build zip file
      async function* data() {
        for (const m of metadata) {
          const input = await fetch(m.url, {
            signal,
            headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
          });
          yield {
            name: m.name,
            input,
          };
        }
      }
      return downloadZip(data(), { metadata });
    }

    return new Response("Not found", { status: 404 });
  };
}
