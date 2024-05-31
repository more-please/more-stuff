import type { APIHandler } from "@solidjs/start/server";
import { goproxy } from "gosub-goproxy";

const config = {
  url: "https://github.com/more-please/more-stuff",
  module: "utf64.moreplease.com",
  directory: "utf64/go",
  tagPrefix: "utf64-go-",
};

const handler = goproxy("/go", config);

export const GET: APIHandler = async ({ request }) => {
  const response = await handler(request);
  for (const k of Object.values(request)) {
    console.log(k);
  }
  if (!response) {
    return new Response("Not Found", { status: 404 });
  }
  return response;
};
