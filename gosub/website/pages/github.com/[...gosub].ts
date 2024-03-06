import type { APIRoute } from "astro";
import { gosub } from "gosub-goproxy";

const handler = gosub("/");

export const GET: APIRoute = async ({ request }) => {
  const response = await handler(request);
  if (!response) {
    return new Response("Not Found", { status: 404 });
  }
  return response;
};
