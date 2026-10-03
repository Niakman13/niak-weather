import { build } from "esbuild";

await build({
  entryPoints: ["src/niak-weather-card.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  sourcemap: true,
  outfile: "dist/niak-weather-card.js",
  legalComments: "none",
});
