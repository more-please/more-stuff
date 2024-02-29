import walkSync from "walk-sync";
import { dirname } from "node:path";

const paths = walkSync(".", {
  globs: ["**/package.json"],
  ignore: ["**/node_modules"],
});
const packages = paths.map((p) => dirname(p)).filter((p) => p !== ".");

export default {
  packages,
};
