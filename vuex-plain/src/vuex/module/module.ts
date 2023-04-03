import { StoreOptions } from "../store";
import { forEachValue } from "../utils";

export class Module {
  public state: any;
  private _raw: StoreOptions<any>;
  public _children: Record<string, Module>;
  public namespace: boolean;

  constructor(rawModule: StoreOptions<any>) {
    this._raw = rawModule;
    this.state = rawModule.state;
    this._children = {};
    this.namespace = Boolean(rawModule.namespace);
  }

  addChild(key: string, module: Module) {
    this._children[key] = module;
  }

  getChild(key: string) {
    return this._children[key] ?? null;
  }

  forEachChild(fn: (val: Module, key: string) => void) {
    forEachValue(this._children, fn);
  }

  forEachGetter(fn: (getter: (state: any) => any, key: string) => void) {
    forEachValue(this._raw.getters ?? {}, fn);
  }

  forEachMutation(fn: (mutation: (state: any, payload: any) => any, key: string) => void) {
    forEachValue(this._raw.mutations ?? {}, fn);
  }

  forEachAction(fn: (action: (store: any, payload: any) => any, key: string) => void) {
    forEachValue(this._raw.actions ?? {}, fn);
  }

  // 方便扩展
}
