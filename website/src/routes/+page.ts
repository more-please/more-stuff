import type { PageLoad } from "./$types";

export const load: PageLoad = (request) => {
  const query = request.url.searchParams;
  let url = query.get("url") ?? "";
  let prefix = query.get("prefix");
  let suffix = query.get("suffix");
  let dir = query.get("dir");
  let result = null;
  let hostError = null;
  if (url) {
    try {
      const u = new URL(url);
      const [_, owner, repo] = u.pathname.split("/");
      if (u.hostname !== "github.com" || !owner || !repo) {
        throw new Error("URL must be https://github.com/[owner]/[repo]");
      }
      const params = new URLSearchParams();
      if (dir) {
        params.set("d", dir);
      }
      if (prefix) {
        params.set("p", prefix);
      }
      if (suffix) {
        params.set("s", suffix);
      }
      result = new URL(`github.com/${owner}/${repo};${params}`, request.url);
    } catch (e) {
      hostError = (e as Error).message;
    }
  }
  return { url, dir, prefix, suffix, result, hostError };
};
