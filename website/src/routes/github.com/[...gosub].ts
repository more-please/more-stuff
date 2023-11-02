import { APIEvent } from "solid-start";
import { gosub } from "gosub-goproxy/gosub";

const env = {
  githubToken: process.env.GITHUB_TOKEN,
};

const handler = gosub("/", { env });

export async function GET(args: APIEvent): Promise<Response> {
  console.log("TOKEN", env.githubToken);
  const result = await handler(args.request);
  return result ?? new Response("Not found", { status: 404 });
}
