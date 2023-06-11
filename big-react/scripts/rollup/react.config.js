import path from "node:path";

import generatePackageJson from "rollup-plugin-generate-package-json";

import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from "./utils";

const { name, module, main, version, description } = getPackageJSON("react");
// react 包的路径
const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
  // react
  {
    input: path.join(pkgPath, "src", "index.ts"),
    output: [
      {
        file: path.join(pkgDistPath, module),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, main),
        name: "React",
        format: "umd"
      }
    ],
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: () => ({
          name,
          description,
          version,
          main,
          module
        })
      })
    ]
  },
  // jsx-runtime
  {
    input: path.join(pkgPath, "src", "jsx.ts"),
    output: [
      // jsx-runtime
      {
        file: path.join(pkgDistPath, `jsx-runtime.esm.js`),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, `jsx-runtime.js`),
        name: "jsx",
        format: "umd"
      },
      // jsx-dev-runtime
      {
        file: path.join(pkgDistPath, `jsx-dev-runtime.esm.js`),
        format: "esm"
      },
      {
        file: path.join(pkgDistPath, `jsx-dev-runtime.js`),
        name: "jsxDEV",
        format: "umd"
      }
    ],
    plugins: getBaseRollupPlugins()
  }
];
