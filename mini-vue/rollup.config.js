// rollup 的配置
import path from "path";
import json from "@rollup/plugin-json";
import resolvePlugin from "@rollup/plugin-node-resolve";
import tsPlugin from "rollup-plugin-typescript2";

// 根据环境变量中的 target 属性，获取对应模块中的 package.json
// 找到 packages
const packagesDir = path.resolve(__dirname, "packages");
// packageDir 打包的基准 找到要打包的某个包
const packageDir = path.resolve(packagesDir, process.env.TARGET);
// 永远针对的是某个模块
const resolve = (p) => path.resolve(packageDir, p);

const pkg = require(resolve("package.json"));
// 取文件名
const name = path.basename(packageDir);

// 对打包类型，先做一个映射表，根据你提供的 formats 来格式化需要打包内容
const outputConfig = {
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: "es",
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: "cjs",
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: "iife", // 立即执行函数
  },
};

// 自己在 package.json 中定义的选项
const options = pkg.buildOptions;

function createConfig(format, output) {
  output.name = options.name;
  // 生成 sourcemap
  output.sourcemap = true;

  // 生成 rollup 配置
  return {
    input: resolve(`src/index.ts`),
    output,
    plugins: [
      json(),
      tsPlugin({
        tsconfig: path.resolve(__dirname, "tsconfig.json"),
      }),
      // 解析第三方模块
      resolvePlugin(),
    ],
  };
}

// rollup 最终需要导出配置文件
export default options.formats.map((format) =>
  createConfig(format, outputConfig[format])
);
