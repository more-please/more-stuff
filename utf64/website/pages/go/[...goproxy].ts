import type { APIRoute } from "astro";
import { goproxy } from "gosub-goproxy";

const handler = goproxy("/go", {
  url: "https://github.com/more-please/more-stuff",
  module: "utf64.moreplease.com",
  directory: "utf64/go",
  tagPrefix: "utf64-go-",
});

export const GET: APIRoute = async ({ request }) => {
  const response = await handler(request);
  if (!response) {
    return new Response("Not Found", { status: 404 });
  }
  return response;
};
