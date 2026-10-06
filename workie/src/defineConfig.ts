import type { WorkieConfig } from "./types.ts";

/**
 * Identity function for TypeScript type inference. Wrap your `workie.config.ts`
 * default export in `defineConfig({ ... })` to get type checking and
 * autocompletion.
 */
export function defineConfig(config: WorkieConfig): WorkieConfig {
  return config;
}
