#! /usr/bin/env bun

import { Command, Option } from "@commander-js/extra-typings";

import { gosub } from "./lib/index.ts";

const { base, port } = new Command()
  .description("Standalone Gosub server")
  .addOption(new Option("-p, --port <number>").env("PORT").default(6060))
  .addOption(new Option("-b, --base <string>").env("BASE").default("/"))
  .parse()
  .opts();

const server = gosub(base);

async function handler(request: Request): Promise<Response> {
  let result: Response;
  try {
    const response = await server(request);
    result = response ?? new Response("Not found", { status: 404 });
  } catch (e) {
    console.error(e);
    result = new Response("Server error", { status: 500 });
  }
  console.error(`${request.method} ${request.url} ${result.status}`);
  return result;
}

// Don't import global types to avoid polluting the TS namespace for other modules.
// Instead, we'll figure out which runtime we're on dynamically.
const bun = (globalThis as any).Bun;
const deno = (globalThis as any).Deno;

if (bun) {
  process.stderr.write(`Gosub server using Bun on port: ${port}\n`);
  bun.serve({ port, fetch: handler });
} else if (deno) {
  console.error("Gosub server using Deno");
  deno.serve({ port }, handler);
} else {
  // Assume we're on plain Node, possibly without top-level 'await'...
  console.error(`Gosub server using Node on port: ${port}`);
  import("node:http").then((http) => {
    http
      .createServer(async (request, response) => {
        // We don't get a real hostname, but luckily Gosub doesn't care.
        const url = `https://dont.care${request.url}`;
        handler(new Request(url)).then((result) => {
          response.statusCode = result.status;
          response.statusMessage = result.statusText;
          result.headers.forEach((val, key) => response.appendHeader(key, val));
          response.write("TODO - pipe response\n");
          response.end();
        });
      })
      .listen(port);
  });
}
