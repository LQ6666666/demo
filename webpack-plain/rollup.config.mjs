// import path from "node:path";
import { fileURLToPath } from "node:url";

import commonjs from "@rollup/plugin-commonjs";
import ts from "rollup-plugin-typescript2";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import packageJson from "./package.json" assert { type: "json" };

const resolveApp = (/** @type {string} */ p) => fileURLToPath(new URL(p, import.meta.url));

export default {
  input: resolveApp("src/index.ts"),
  external: [...Object.keys(packageJson.devDependencies)],
  output: {
    file: resolveApp("dist/webpack.js"),
    name: "webpack",
    format: "cjs",
    generatedCode: {
      constBindings: true
    },
    exports: "default",
    interop: "compat"
  },
  plugins: [
    json(),
    ts({ tsconfig: resolveApp("tsconfig.json") }),
    resolve({ browser: false }),
    commonjs()
  ]
};
