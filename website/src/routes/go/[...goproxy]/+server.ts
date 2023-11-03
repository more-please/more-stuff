import { error, type RequestHandler } from "@sveltejs/kit";
import { goproxy } from "gosub-goproxy";
import { env } from "$env/dynamic/private";

const config = {
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
};

const ENV = {
  githubToken: env.GITHUB_TOKEN,
};

const handler = goproxy("/go", config, ENV);

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    throw error(404);
  }
  return response;
};
