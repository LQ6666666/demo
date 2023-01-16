import path from "node:path";

import Compiler from "./Compiler";
import { WebpackOption } from "./types";

function webpack(options: WebpackOption) {
  // 1.初始化参数：从配置文件和 shell 语句中读取并合并参数，得出最终的配置对象
  const shellConfig = process.argv.slice(2).reduce<WebpackOption>(
    (shellConfig, item) => {
      const [key, value] = item.split("=");
      (shellConfig as any)[key.slice(2)] = value;
      return shellConfig;
    },
    // 默认值
    {
      entry: "./src/index.js",
      output: {
        filename: "bundle.js",
        path: path.join(process.cwd(), "dist")
      }
    }
  );

  // 2.得出最终的配置对象
  const finalOptions = Object.assign({}, options, shellConfig);

  // 3. 用上一步得到的参数初始化 Compiler 对象
  const compiler = new Compiler(finalOptions);

  // 4. 加载所有配置的插件
  if (Array.isArray(finalOptions.plugins) && finalOptions.plugins.length > 0) {
    // 刚开始的时候，就会执行所有的插件实例的 apply 方法，并传递 compiler 实例
    // 所以说插件实在 webpack 开始编译之前全部挂载的
    // 要在插件监听的钩子触发才会执行
    for (const plugin of finalOptions.plugins) {
      plugin.apply(compiler);
    }
  }

  return compiler;
}

export default webpack;
