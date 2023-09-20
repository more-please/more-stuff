import * as github from "./github";

import { Output, parse } from "valibot";
import { removePrefix, removeSuffix } from "./utils";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const textHeaders = {
  "Content-Type": "text/plain",
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
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(`AHOY\n`);
          for await (const page of github.paginate(
            `${github.api}/repos/${owner}/${repo}/tags`,
            { signal },
          )) {
            const json = await page.json();
            console.log("PAGE", json);
            const tags = json as Output<typeof github.Tags>; // parse(github.Tags, json);
            for (const tag of tags) {
              console.log("TAG", tag);
              const v = decodeVersion(tag.name);
              if (v) {
                console.log("VERSION", `v${v.major}.${v.minor}.${v.patch}\n`);
                controller.enqueue(`v${v.major}.${v.minor}.${v.patch}\n`);
              }
            }
          }
          console.log("DONE");
          controller.close();
        },
        cancel(e) {
          abort(e);
        },
      });
      return new Response(stream, { headers: textHeaders });
    }

    const info = removeSuffix(".info", v);
    if (info) {
      const refData = await fetch(
        `${github.api}/repos/${owner}/${repo}/git/ref/tags/${prefix}${info}${suffix}`,
        { signal },
      );
      const ref = parse(github.Ref, await refData.json());
      const tagData = await fetch(ref.object.url);
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
      const result = await fetch(url, { signal });
      const text = await result.text();
      return new Response(text, { headers: textHeaders });
    }

    return new Response("Not found", { status: 404 });
  };
}
