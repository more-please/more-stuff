import { importAssets } from "svelte-preprocess-import-assets";
import netlify from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [importAssets(), vitePreprocess()],

  kit: {
    adapter: netlify({
      edge: true,
    }),
  },
};

export default config;
