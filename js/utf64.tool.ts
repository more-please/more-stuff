#!/usr/bin/env node

import * as fs from "node:fs";

import { str_to_utf64, utf64_to_str } from "./utf64.js";

const USAGE = `Usage: utf64 [-hd]
  -h, --help   Display this message
  -d, --decode Decode input
`;

const args = [...process.argv];
args.shift(); // node
args.shift(); // utf64.tool.js

let decode = false;

for (let arg = args.shift(); arg; arg = args.shift()) {
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

const input = fs.readFileSync(0, "utf-8");
const output = decode ? utf64_to_str(input) : str_to_utf64(input);

process.stdout.write(`${output}\n`);
