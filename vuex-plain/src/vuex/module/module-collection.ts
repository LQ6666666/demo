import { StoreOptions } from "../store";
import { forEachValue } from "../utils";
import { Module } from "./module";

export class ModuleCollection {
  public root: null | Module;
  constructor(rootModule: StoreOptions<any>) {
    this.root = null;
    this.register(rootModule, []);
  }

  register(rawModule: StoreOptions<any>, path: any[]) {
    // 是一个根模块
    const newModule = new Module(rawModule);
    if (path.length === 0) {
      this.root = newModule;
    } else {
      const parent = path.slice(0, -1).reduce((module, current) => {
        return module.getChild(current);
      }, this.root);

      parent.addChild(path.at(-1)!, newModule);
    }

    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(rawChildModule, path.concat(key));
      });
    }
    return newModule;
  }

  getNamespaced(path: string[]) {
    let module = this.root!;
    return path.reduce((namespacedStr, key) => {
      module = module.getChild(key);
      return namespacedStr + (module.namespace ? key + "/" : "");
      return "";
    }, "");
  }
}
