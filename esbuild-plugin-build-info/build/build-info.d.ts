// Virtual module generated by @moreplease/esbuild-plugin-build-info
declare module "build-info" {

  // Metadata about the current esbuild bundle.
  export type BuildInfo = {
    branch: string; // Git branch we built from
    commit: string; // Git commit we built from
    timestamp: Date; // When the build started
  };

  export const branch: BuildInfo["branch"];
  export const commit: BuildInfo["commit"];
  export const timestamp: BuildInfo["timestamp"];

  const _default: BuildInfo;
  export default _default;
}
