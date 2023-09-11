import { str_to_utf64, utf64_to_str } from "utf64";

import type { PageLoad } from "./$types";

export const load: PageLoad = (request) => {
  const query = request.url.searchParams;
  let src = query.get("encode") ?? "";
  let dest = query.get("decode") ?? "";
  if (src) {
    dest = str_to_utf64(src);
  } else if (dest) {
    src = utf64_to_str(dest);
  }
  return { src, dest };
};
