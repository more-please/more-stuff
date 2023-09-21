import { error, type RequestHandler } from "@sveltejs/kit";
import { goproxy } from "gosub-goproxy";

const handler = goproxy({
  base: "/go",
  repo: "https://github.com/more-please/utf64",
});

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    throw error(404);
  }
  return response;
};
