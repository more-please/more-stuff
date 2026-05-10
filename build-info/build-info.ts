import { execSync } from "node:child_process";

function run(command: string): string {
  return execSync(command, { encoding: "utf-8" }).trim();
}

export const branch =
  process.env.GITHUB_REF_NAME ?? run("git rev-parse --abbrev-ref HEAD");

export const commit =
  process.env.GITHUB_SHA ?? run('git show --format="%H" -s HEAD');

export const timestamp = new Date();
