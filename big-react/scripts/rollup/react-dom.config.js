import path from "node:path";

import generatePackageJson from "rollup-plugin-generate-package-json";
import alias from "@rollup/plugin-alias";

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from "./utils";

const { name, module, main, version, description, peerDependencies } = getPackageJSON("react-dom");
// react-dom 包的路径
const pkgPath = resolvePkgPath(name);
// react-dom 的产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
  // react-dom
  {
    input: path.join(pkgPath, "src", "index.ts"),
    output: [
      {
        file: path.join(pkgDistPath, module),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, main),
        name: "ReactDOM",
        format: "umd"
      },
      {
        file: path.join(pkgDistPath, "client.esm.js"),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, "client.js"),
        name: "client",
        format: "umd"
      }
    ],
    external: [...Object.keys(peerDependencies), "scheduler"],
    plugins: [
      ...getBaseRollupPlugins(),
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
  },
  // react-test-utils
  {
    input: path.join(pkgPath, "src", "test-utils.ts"),
    output: [
      {
        file: path.join(pkgDistPath, "test-utils.esm.js"),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, "test-utils.js"),
        name: "testUtils",
        format: "umd"
      }
    ],
    external: ["react-dom", "react"],
    plugins: getBaseRollupPlugins()
  }
];
