import * as utf64 from "utf64";

import type { PageLoad } from "./$types";

export const load: PageLoad = (request) => {
  const query = request.url.searchParams;
  let src = query.get("encode") ?? "";
  let dest = query.get("decode") ?? "";
  if (src) {
    dest = utf64.encode(src);
  } else if (dest) {
    src = utf64.decode(dest);
  }
  return { src, dest };
};
