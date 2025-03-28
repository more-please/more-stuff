import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";
import { gosub } from "gosub-goproxy";

const handler = gosub("/", {
  GITHUB_TOKEN: getSecret("GITHUB_TOKEN"),
  GOSUB_VERBOSE: getSecret("GOSUB_VERBOSE"),
});

export const GET: APIRoute = async ({ request }) => {
  const response = await handler(request);
  if (!response) {
    return new Response("Not Found", { status: 404 });
  }
  return response;
};
