import { defineConfig } from "tsup";

// The tsup CLI has no --noExternal flag, so bundling options live here.
// Workspace packages (@rasa/*) export TypeScript source and are inlined; third-party
// dependencies stay external and are resolved from node_modules at runtime.
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@rasa\//],
});
