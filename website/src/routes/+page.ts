import * as utf64 from "utf64";

import type { PageLoad } from "./$types";

export const load: PageLoad = (request) => {
  const query = request.url.searchParams;
  let src = query.get("encode") ?? "";
  let dest = query.get("decode") ?? "";
  let error = null;
  if (src) {
    dest = utf64.encode(src);
  } else if (dest) {
    try {
      src = utf64.decode(dest);
    } catch (err) {
      const e = err as Error;
      error = e.message;
    }
  }
  return { src, dest, error };
};
