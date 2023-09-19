import { array, object, string } from "valibot";

export const Tags = array(object({ name: string() }));
export const Tag = object({ tagger: object({ date: string() }) });
export const Ref = object({ object: object({ sha: string(), url: string() }) });

const NEXT_LINK = /(?<=<)([\S]*)(?=>; rel="Next")/i;

export const api = "https://api.github.com";

export async function* paginate(
  url: string,
  options?: RequestInit,
): AsyncGenerator<Response> {
  while (url) {
    const response = await fetch(url, options);
    const link = response.headers.get("link");
    yield response;
    url = (link && link.match(NEXT_LINK)?.[0]) ?? "";
  }
}
