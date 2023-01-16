import fs from "node:fs";
import path from "node:path";
import { WebpackChunk } from "../types";

export function toUnixPath(filePath: string) {
  // path.posix.sep 不同操作系统的路径分隔符
  return filePath.replace(/\\/g, path.posix.sep);
}

export const baseDir = toUnixPath(process.cwd());

export function tryExtensions(
  modulePath: string,
  extensions = [".js", ".jsx", ".json"],
  originalModulePath: string,
  moduleContext: string
) {
  let ans = modulePath;
  let exist = fs.existsSync(modulePath);

  let index = 0;
  while (!exist && index < extensions.length) {
    ans = modulePath + extensions[index++];
    exist = fs.existsSync(ans);
  }

  if (exist) {
    return ans;
  } else {
    throw new Error(
      `Module not found: Error: Can't ${originalModulePath} resolve in ${moduleContext}`
    );
  }
}

export const getSource = (chunk: WebpackChunk) => {
  return `
  (() => {
    const __webpack_modules__  = {
      ${chunk.modules
        .map(
          module => `"${module.id}": (module, exports, __webpack_require__) => {${module._source}}`
        )
        .join(",\n")}
    };

    const __webpack_module_cache__  = {};

    function __webpack_require__(moduleId) {
      // 1. 读取缓存结果
      const cachedModule = __webpack_module_cache__ [moduleId];
      // 2 .读到了直接返回
      if (cachedModule !== undefined) return cachedModule;
      // 3. 创建 module 对象，里面有 exports 属性, 在 __webpack_module_cache__  里面放一下
      const module = (__webpack_module_cache__ [moduleId] = {
        exports: {},
      });

      // 3. 去映射关系里面去取
      __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
      // 4. 返回结果
      return module.exports;
    }

    (() => {
      ${chunk.entryModule._source}
    })();
  })();
  `;
};
