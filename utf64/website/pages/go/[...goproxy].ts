import type { APIRoute } from "astro";
import { getSecret } from "astro:env/server";
import { goproxy } from "gosub-goproxy";

const handler = goproxy(
  "/go",
  {
    url: "https://github.com/more-please/more-stuff",
    module: "utf64.moreplease.com",
    directory: "utf64/go",
    tagPrefix: "utf64-go-",
  },
  {
    GITHUB_TOKEN: getSecret("GITHUB_TOKEN"),
    GOSUB_VERBOSE: getSecret("GOSUB_VERBOSE"),
  },
);

export const GET: APIRoute = async ({ request }) => {
  const response = await handler(request);
  if (!response) {
    return new Response("Not Found", { status: 404 });
  }
  return response;
};
