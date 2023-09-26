import { error, type RequestHandler } from "@sveltejs/kit";
import { goproxy } from "gosub-goproxy";

const handler = goproxy("/go", {
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
});

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    throw error(404);
  }
  return response;
};
