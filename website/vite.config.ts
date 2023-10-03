import { defineConfig } from "vite";
import netlify from "solid-start-netlify";
import solid from "solid-start/vite";

export default defineConfig({
  plugins: [
    solid({
      adapter: netlify({
        edge: true,
      }),
    },
    )],
});
