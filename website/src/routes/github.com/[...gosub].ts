import { APIEvent } from "solid-start";
import { gosub } from "gosub-goproxy/gosub";

const handler = gosub("/");

export function GET(args: APIEvent): Response {
  return Response.json("Success");
  // const result = await handler(args.request);
  // return result ?? new Response("Not found", { status: 404 });
}
