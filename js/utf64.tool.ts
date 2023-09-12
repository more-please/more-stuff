/// <reference types="node" />

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import * as utf64 from "./utf64.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const USAGE = `Usage: utf64 [-dhv] [args...]
  -d, --decode  Decode input (default is encode)
  -h, --help    Display this message
  -v, --version Display version number

Each argument is (de)coded and printed to a separate line on stdout.
If no arguments are supplied, stdin is used for input.
`;

const args = [...process.argv];
args.shift(); // node
args.shift(); // utf64.tool.js

let decode = false;
const input = [];

for (let arg = args.shift(); arg; arg = args.shift()) {
  if (!arg.startsWith("-")) {
    input.push(arg);
    continue;
  }
  switch (arg) {
    case "-d":
    case "--decode":
      decode = true;
      break;

    case "-h":
    case "--help":
      process.stdout.write(USAGE);
      process.exit(0);

    case "-v":
    case "--version": {
      // Read manually instead of importing, as Node currently
      // requires import assertion but prints a warning anyway.
      const src = path.join(__dirname, "../package.json");
      const json = JSON.parse(fs.readFileSync(src, "utf-8"));
      process.stdout.write(`${json.version}\n`);
      process.exit(0);
    }

    default:
      process.stderr.write(`*** Unknown flag: ${arg}\n\n`);
      process.stderr.write(USAGE);
      process.exit(1);
  }
}

if (input.length === 0) {
  input.push(fs.readFileSync(0, "utf-8"));
}

for (const line of input) {
  const output = decode ? utf64.decode(line) : utf64.encode(line);
  process.stdout.write(`${output}\n`);
}
