import fs from "node:fs";
import path from "node:path";

import { SyncHook } from "tapable";
import types from "babel-types";
// 代码转成 AST 抽象语法树
import parser from "@babel/parser";
// 遍历语法树
import traverse from "@babel/traverse";
// 把语法树重新生成代码
import generator from "@babel/generator";

import { baseDir, getSource, toUnixPath, tryExtensions } from "./utils";
import {
  WebpackOption,
  CompilerHooks,
  WebpackStats,
  WebpackModule,
  WebpackChunk,
  WebpackAssets
} from "./types";

class Compiler {
  public options: WebpackOption;
  public hooks: CompilerHooks;
  public modules: WebpackModule[];
  public entries: Set<WebpackChunk>;
  public chunks: Set<WebpackChunk>;
  public assets: WebpackAssets;
  public files: string[];

  constructor(options: WebpackOption) {
    this.options = options;
    this.modules = [];

    this.hooks = {
      // 会在开始编译的时候触发
      run: new SyncHook(),
      // 会在将要写入文件的时候触发
      emit: new SyncHook(),
      // 会在完成编译的时候触发
      done: new SyncHook()
    };

    // 存放所有的入口
    this.entries = new Set();
    // 这里存放着所有的模块
    this.modules = [];
    // 所有的 chunk
    this.chunks = new Set();
    // 输出的列表，存放着将要产出的资源文件
    this.assets = Object.create(null);
    // 本此编译所有产出的文件名
    this.files = [];
  }

  run(callback: (err: Error | null, stats: WebpackStats) => void): void {
    // 在调用 run 方法的时候，会触发 run 这个钩子，进而执行它的回调函数
    this.hooks.run.call();

    // ********** 开始编译 **********
    // 5.根据配置中的 entry 找出入口文件，得到 entry 的绝对路径
    let entry: Record<string, string> = {};
    if (typeof this.options.entry === "string") {
      this.options.entry = {
        main: this.options.entry
      };
    }
    for (const name in this.options.entry) {
      const entryPath = this.options.entry[name];

      // 是不是绝对路径
      // E:\learn\webpack\src\index.js
      if (path.isAbsolute(entryPath)) {
        entry[name] = entryPath;
      } else {
        // 不是绝对路径 => 绝对路径
        entry[name] = path.join(this.options.context ?? baseDir, entryPath);
      }
      entry[name] = toUnixPath(entry[name]);
    }

    for (const entryName in entry) {
      // 6.从入口模块出发，调用所有配置的 loader 对模块进行编译
      const entryModule = this.buildModule(entryName, entry[entryName]);
      // 入口不需要放进去
      // this.modules.push(entryModule);

      // 8.根据入口和模块之前的依赖关系，组装成一个个包含多个模块的 Chunk
      // 一个 chunk 会成为 this.assets 对象的一个 key value
      // 一个 chunk 对应 this.assets 的一个属性，而每个 assets 属性会对应一个文件 file
      const chunk = {
        name: entryName,
        entryModule,
        modules: this.modules.filter(module => module.name === entryName)
      };

      this.chunks.add(chunk);
      // 也是入口代码块
      this.entries.add(chunk);
    }

    // 9.把每个 chunk 转化成单独的文件加入到输出列表
    const output = this.options.output;
    this.chunks.forEach(chunk => {
      // key 文件名, 值是打包后的内容
      // this.assets[chunk.name + ".js"] = chunk.name;
      const filename = output.filename.replace("[name]", chunk.name);
      this.assets[filename] = getSource(chunk);
    });

    this.hooks.emit.call();

    // 10.在确定输出内容后, 根据配置确认输出的路径和文件名, 把文件写入到文件系统
    // ["main.js"]
    this.files = Object.keys(this.assets);
    // 存放本次编译输出的目标文件路径
    for (const file of this.files) {
      const targetPath = path.join(output.path, file);

      const dirname = path.dirname(targetPath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname);
      }
      fs.writeFileSync(targetPath, this.assets[file]);
    }
    this.hooks.done.call();

    callback(null, {
      // 此对象 stats 统计信息, 表示本次编译结果的描述信息对象
      toJson: () => {
        return {
          entries: this.entries,
          chunks: this.chunks,
          modules: this.modules,
          files: this.files,
          assets: this.assets
        };
      }
    });
  }

  /** 编译模块, 读取模块文件内容 */
  buildModule(name: string, modulePath: string) {
    const options = this.options;
    // 读取原始代码
    const originalSourceCode = fs.readFileSync(modulePath, "utf-8");
    let targetSourceCode = originalSourceCode;
    // 查找此模块对应的 loader 对代码进行转换
    const rules = this.options.module?.rules ?? [];
    // 找到这个模块的 loaders: ["loader1-loader", "loader2-loader"]
    const loaders = rules.reduce<string[]>((loaders, rule) => {
      // 匹配规则
      if (rule.test.test(modulePath)) {
        loaders = loaders.concat(rule.use);
      }
      return loaders;
    }, []);
    // 执行 loaders
    // pitch 先执行了, loader 就倒着执行
    for (let i = loaders.length - 1; i > -1; i--) {
      // 加载 loader, 调用 loader
      targetSourceCode = require(loaders[i])(targetSourceCode);
    }

    // 相对于根目录的相对路径
    // index.js
    // 相对路径 E:/learn/webpack/src/index.js
    // 跟目录 E:/learn/webpack/src
    // 此模块的绝对路径相对于根目录的相对路径 ./src/index.js 就是模块 ID
    const moduleId = "./" + path.posix.relative(baseDir, modulePath);
    // 定义模块
    const module: WebpackModule = { id: moduleId, dependencies: [], name, _source: "" };

    // 拿到转换后的代码
    // 找出该模块依赖的模块，在递归本步骤直到所有的入口依赖都经过了本步骤的处理
    const ast = parser.parse(targetSourceCode, { sourceType: "module" });

    // 遍历语法树，并找出 require 节点
    traverse(ast, {
      CallExpression({ node }: any) {
        if (node.callee.name === "require") {
          // 替换 require 语句为 webpack 自定义的 require 方法
          node.callee.name = "__webpack_require__";
          // 获得依赖的路径 require("./a")
          const moduleName = (node.arguments[0] as any).value;
          // 获取当前路径所在的目录
          const dirname = path.posix.dirname(modulePath);

          // 依赖的路径
          let depModulePath: string;
          // 绝对还是相对，相对才需要下面的处理
          if (path.isAbsolute(moduleName)) {
            depModulePath = moduleName;
          } else {
            // E:/learn/webpack/src + ./a
            depModulePath = path.posix.join(dirname, moduleName);
          }

          // 匹配文件后缀名
          const extensions = options.resolve?.extensions;
          // E:/learn/webpack/src/index.js
          depModulePath = tryExtensions(depModulePath, extensions, moduleName, dirname);

          // depModulePath = /a/b/c
          // baseDir = /a/b
          // relative(相对路径) => ./c
          // 计算出 moduleId
          const depModuleId = "./" + path.posix.relative(baseDir, depModulePath);
          // 修改抽象语法树, 将依赖的路径修改成以当前路行为基准
          node.arguments = [types.stringLiteral(depModuleId)];
          module.dependencies.push(depModulePath);
        }
      }
    });

    // 根据新的语法树，生成新的代码
    const { code } = generator(ast);
    module._source = code;

    // 7.在递归本步骤，直到所以的入口依赖的文件都经过了本步骤的处理
    module.dependencies.forEach(dependency => {
      const dependencyModule = this.buildModule(name, dependency);
      // 添加到全局的模块
      this.modules.push(dependencyModule);
    });

    return module;
  }
}

export default Compiler;
