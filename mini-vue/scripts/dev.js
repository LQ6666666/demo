// 只针对具体的某个模块
const fs = require("fs");
const execa = require("execa"); // 开启子进程进行打包，最终还是 rollup 进行打包

const target = "reactivity";

// 对我们的目标进行依次打包，并行打包
async function build(target) {
  // rollup -c --environment TARGET:shared
  await execa("rollup", ["-cw", "--environment", `TARGET:${target}`], {
    stdio: "inherit", // 子进程打包的信息共享给父进程
  });
}

build(target);
