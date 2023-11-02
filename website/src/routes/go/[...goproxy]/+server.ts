import { error, type RequestHandler } from "@sveltejs/kit";
import { goproxy } from "gosub-goproxy";

const config = {
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
};

const env = {
  githubToken: process.env.GITHUB_TOKEN,
};

const handler = goproxy("/go", config, env);

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    throw error(404);
  }
  return response;
};
