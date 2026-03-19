type BuildInfo = {
    branch: string;
    commit: string;
    timestamp: Date;
};
declare function branch(): Promise<BuildInfo["branch"]>;
declare function commit(): Promise<BuildInfo["commit"]>;
declare function buildInfo(): Promise<BuildInfo>;
declare function plugin(): {
    name: string;
    buildStart(): void;
    resolveId(source: string): string | null;
    load(id: string): Promise<string | null>;
};

export { type BuildInfo, branch, buildInfo, commit, plugin as default };
