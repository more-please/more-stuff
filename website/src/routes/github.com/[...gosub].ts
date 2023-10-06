import { APIEvent } from "solid-start";
import { gosub } from "gosub-goproxy/gosub";

const handler = gosub("/");

export async function GET(args: APIEvent): Promise<Response> {
  const result = await handler(args.request);
  return result ?? new Response("Not found", { status: 404 });
}
