class ReadMePlugin {
  constructor(options) {
    this.options = options;
  }

  // 每个插件定死了有一个 apply 方法
  apply(compiler) {
    // 让你可以在插件改变输出结果
    compiler.hooks.emit.tap("ReadMePlugin", () => {
      compiler.assets["README.md"] = "读我读我";
      //   delete compiler.assets["page1.js"];
    });
  }
}

module.exports = ReadMePlugin;
