// 1. 引入核心模块
const webpack = require("../../dist/webpack");
// 2. 加载配置文件
const options = require("./webpack.config");
// 执行 webpack 得到编译对象 Compiler，就是一个大管家，是核心对象
const compiler = webpack(options);
// 调用它的 run 方法，开启启动编译
compiler.run((err, stats) => {
  // 编译成功之后执行回调，err 是错误信息
  console.log(err);
  // stats 是编译结果的描述对象
  console.log(stats)
  // console.log(
  //   stats?.toJson({
  //     // 产出的资源 bundle.js
  //     assets: true,
  //     // 代码块 bundle
  //     chunks: true,
  //     // 模块 ["./src/index.js", "./src/title.js"]
  //     modules: true,
  //     // 入口 ./src/index.js
  //     entries: true
  //   })
  // );

  // namedChunkGroups 代码块的组，这个概念是 webpack4 引入的，是为了实现代码分隔 SplitChunks

  //   require("fs").writeFileSync(
  //     "stats.json",
  //     JSON.stringify(
  //       stats?.toJson({
  //         // 产出的资源 bundle.js
  //         assets: true,
  //         // 代码块 bundle
  //         chunks: true,
  //         // 模块 ["./src/index.js", "./src/title.js"]
  //         modules: true,
  //         // 入口 ./src/index.js
  //         entries: true,
  //       })
  //     ),
  //     "utf-8"
  //   );
});
