import path from "node:path";

import generatePackageJson from "rollup-plugin-generate-package-json";
import alias from "@rollup/plugin-alias";

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from "./utils";

const {
  module,
  main,
  version,
  description,
  peerDependencies = {}
} = getPackageJSON("react-noop-renderer");

const name = "react-noop-renderer";
// react-noop-renderer 包的路径
const pkgPath = resolvePkgPath(name);
// react-noop-renderer 的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
  // react-noop-renderer
  {
    input: path.join(pkgPath, "src", "index.ts"),
    output: [
      {
        file: path.join(pkgDistPath, module),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, main),
        name: "ReactNoopRenderer",
        format: "umd"
      }
    ],
    external: [...Object.keys(peerDependencies), "scheduler"],
    plugins: [
      ...getBaseRollupPlugins({
        typescript: {
          exclude: [`packages/react-dom/**/*`],
          tsconfigOverride: {
            compilerOptions: {
              paths: {
                hostConfig: [`packages/${name}/src/hostConfig.ts`]
              }
            }
          }
        }
      }),
      alias({
        entries: {
          hostConfig: path.join(pkgPath, "src", "hostConfig.ts")
        }
      }),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: () => ({
          name,
          description,
          version,
          main,
          module,
          peerDependencies: {
            react: version
          }
        })
      })
    ]
  }
];
