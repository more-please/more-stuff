import { APIEvent } from "solid-start";
import { gosub } from "gosub-goproxy/gosub";

const handler = gosub("/");

export async function GET(args: APIEvent) {
  return handler(args.request) ?? new Response("Not found", { status: 404 });
}
