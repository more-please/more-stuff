/// <reference path="build-info.d.ts" />
import type { Plugin } from "esbuild";

export interface BuildInfo {
  timestamp: Date;
  branch: string;
  commit: string;
}

export function branch(): Promise<BuildInfo["branch"]>;
export function commit(): Promise<BuildInfo["commit"]>;
export function buildInfo(): Promise<BuildInfo>;

export default function buildInfoPlugin(): Plugin;
