#!/usr/bin/env node

import * as fs from "node:fs";

import { str_to_utf64, utf64_to_str } from "./utf64.js";

const USAGE = `Usage: utf64 [-hd] [args...]
  -h, --help   Display this message
  -d, --decode Decode input (default is encode)

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
    case "-h":
    case "--help":
      process.stdout.write(USAGE);
      process.exit(0);

    case "-d":
    case "--decode":
      decode = true;
      break;

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
  const output = decode ? utf64_to_str(line) : str_to_utf64(line);
  process.stdout.write(`${output}\n`);
}
