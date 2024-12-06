declare module "build-info" {
  export const commit: string;
  export const timestamp: Date;
  const _default: { commit: string; timestamp: Date };
  export default _default;
}
