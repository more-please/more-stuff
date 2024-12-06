declare module "build-info" {
  export const branch: BuildInfo["branch"];
  export const commit: BuildInfo["commit"];
  export const timestamp: BuildInfo["timestamp"];
  const _default: BuildInfo;
  export default _default;
}
