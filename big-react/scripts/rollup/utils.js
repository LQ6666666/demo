import path from "node:path";
import fs from "node:fs";

import ts from "rollup-plugin-typescript2";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

const pkgPath = path.resolve(__dirname, "..", "..", "packages");
const distPath = path.resolve(__dirname, "..", "..", "dist", "node_modules");

export function resolvePkgPath(pkgName, isDist) {
  if (isDist) {
    return path.join(distPath, pkgName);
  }
  return path.join(pkgPath, pkgName);
}

export function getPackageJSON(pkgName) {
  // 包路径
  const pkgPath = path.join(resolvePkgPath(pkgName), "package.json");
  const str = fs.readFileSync(pkgPath, { encoding: "utf-8" });
  return JSON.parse(str);
}

export function getBaseRollupPlugins({
  typescript = {},
  alias = {
    __DEV__: true,
    preventAssignment: true
  }
} = {}) {
  return [replace(alias), commonjs(), ts(typescript)];
}
