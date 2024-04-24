import { defineConfig } from "vite";

export default defineConfig({
  base: "/hello-gainmap/",
  server: {
    port: 3000,
  },
  optimizeDeps:{
    exclude:['@monogrid/gainmap-js/libultrahdr'],
  }
});
