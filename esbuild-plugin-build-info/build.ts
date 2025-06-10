import { build } from 'esbuild';

await build({
  entryPoints: ['esbuild-plugin-build-info.ts'],
  outfile: 'build/index.js',
  format: 'esm',
  platform: 'node',
  target: 'node18',
  bundle: true,
  external: ['esbuild'],
});
