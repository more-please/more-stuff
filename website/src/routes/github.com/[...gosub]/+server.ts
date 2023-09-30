import { error, type RequestHandler } from "@sveltejs/kit";
import { gosub } from "gosub-goproxy";

const handler = gosub();

export const GET: RequestHandler = async (event) => {
  const response = await handler(event.request);
  if (!response) {
    throw error(404);
  }
  return response;
};
