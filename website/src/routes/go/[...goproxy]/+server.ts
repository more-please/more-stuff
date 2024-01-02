import { error, type RequestHandler } from "@sveltejs/kit";
import { goproxy } from "gosub-goproxy";

const config = {
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
};

const handler = goproxy("/go", config);

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    error(404);
  }
  return response;
};
