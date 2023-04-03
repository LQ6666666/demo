import type { App } from "vue";
import { reactive, watch } from "vue";
import { storeKey } from "./injectKey";
import { Module } from "./module/module";
import { ModuleCollection } from "./module/module-collection";
import { forEachValue, isPromise } from "./utils";

export interface StoreOptions<S extends object> {
  state: S | (() => S);
  getters?: Record<string, (state: S) => any>;
  actions?: Record<string, (state: Store<S>, payload: any) => any>;
  mutations?: Record<string, (state: S, payload: any) => any>;
  modules?: Record<string, StoreOptions<any>>;
  plugins?: ((store: Store<S>) => void)[];
  namespace?: boolean;
  strict?: boolean;
}

// 根据路径 获取 store. 上面最新的状态
function getNestedState(state: any, path: string[]) {
  return path.reduce((state, key) => state[key], state);
}

// 递归安装
function installModule(store: Store<any>, rootState: any, path: any[], module: Module) {
  // 是不是根
  const isRoot = path.length === 0;

  const namespaced = store._modules.getNamespaced(path);

  if (!isRoot) {
    const parentState = path.slice(0, -1).reduce((state, key) => state[key], rootState);
    store.withCommit(() => {
      parentState[path.at(-1)] = module.state;
    });
  }

  // getters
  module.forEachGetter((getter, key) => {
    store._wrappedGetters[namespaced + key] = () => {
      return getter(getNestedState(store.state, path));
    };
  });

  // mutation
  module.forEachMutation((mutation, key) => {
    const entry = store._mutations[namespaced + key] || (store._mutations[namespaced + key] = []);
    entry.push(payload => {
      mutation.call(store, getNestedState(store.state, path), payload);
    });
  });

  // action
  // action 执行后返回一个 Promise
  module.forEachAction((action, key) => {
    const entry = store._actions[namespaced + key] || (store._actions[namespaced + key] = []);
    entry.push(payload => {
      const res = action.call(store, store, payload);
      // res 是不是 Promise
      if (isPromise(res)) {
        return res;
      } else {
        return Promise.resolve(res);
      }
    });
  });

  module.forEachChild((childModule, key) => {
    installModule(store, rootState, path.concat(key), childModule);
  });
}

function resetStoreState(store: Store<any>, state: any) {
  store._state = reactive({ data: state });
  const wrappedGetters = store._wrappedGetters;
  store.getters = {};
  forEachValue(wrappedGetters, (getter, key) => {
    Object.defineProperty(store.getters, key, {
      get: () => getter(store._state),
      enumerable: true
    });
  });

  if (store.strict) {
    enableStrictMode(store);
  }
}

function enableStrictMode(store: Store<any>) {
  watch(
    () => store._state.data,
    () => {
      console.assert(store._commiting, "do not mutate vuex store state outside mutation handlers");
    },
    // 默认是异步的，这里改成同步监控
    { deep: true, flush: "sync" }
  );
}

export class Store<S extends object> {
  public _state!: { data: S };
  public _mutations!: Record<string, ((state: S, payload?: any) => any)[]>;
  public _actions!: Record<string, ((store: Store<S>, payload?: any) => any)[]>;
  public _modules: ModuleCollection;
  public _wrappedGetters!: Record<string, (state: S) => any>;
  public getters!: Record<string, (state: S) => any>;
  public strict: boolean;
  public _commiting: boolean;
  private _subscribes: (({ type, payload }: { type: string; payload?: any }, state: S) => void)[];

  constructor(options: StoreOptions<S>) {
    // 格式化用户的参数，实现根据自己的需要，后续使用时方便
    this._modules = new ModuleCollection(options);

    // 发布订阅模式
    this._wrappedGetters = Object.create(null);

    this._actions = Object.create(null);

    this._mutations = Object.create(null);

    // 是不是严格模块
    this.strict = Boolean(options.strict);
    // 调用的时候知道是 mutation, mutation 里面写同步代码
    // 在 mutation 之前添加一个状态 _commiting = true
    // 调用 mutation 会更改状态 监控这个状态，如果当前状态变化的时候 __commiting = true 同步更改
    // _commiting = false
    this._commiting = false;

    // 根状态
    const rootState = this._modules.root!.state;
    // 定义状态
    installModule(this, rootState, [], this._modules.root!);

    resetStoreState(this, rootState);

    this._subscribes = [];
    // plugins
    options.plugins ??= [];
    options.plugins.forEach(plugin => plugin(this));
  }

  public subscribe(fn: ({ type, payload }: { type: string; payload?: any }, state: S) => void) {
    this._subscribes.push(fn);
  }

  public replaceState(newState: S) {
    this.withCommit(() => {
      this._state.data = newState;
    });
  }

  public withCommit(fn: (...args: any) => any) {
    // 不在 mutation 里面就是 false
    const commiting = this._commiting;
    this._commiting = true;
    fn();
    this._commiting = commiting;
  }

  public commit = (type: string, payload?: any) => {
    const entry = this._mutations[type] ?? [];
    this.withCommit(() => {
      entry.forEach(handler => handler(payload));
    });

    this._subscribes.forEach(f => f({ type, payload }, this.state));
  };

  public dispatch = (type: string, payload?: any) => {
    const entry = this._actions[type] ?? [];
    return Promise.all(entry.map(handler => handler(payload)));
  };

  public get state(): S {
    return this._state.data;
  }

  install(app: App, injectKey: string | symbol = storeKey) {
    // 全局暴露一个变量 暴露的是 store 的实例
    // 给根 app 增加一个 _provides 子组件会向上去查找
    app.provide(injectKey, this);
    // 增添 $store 属性
    app.config.globalProperties.$store = this;
  }

  registerModule(path: string | string[], rawModule: StoreOptions<any>) {
    if (typeof path === "string") {
      path = [path];
    }

    // 在原有的模块上新增一个
    const module = this._modules.register(rawModule, path);
    // 安装模块
    installModule(this, this.state, path, module);
    // 重置容器
    resetStoreState(this, this.state);
  }
}

// root = {
//   _raw:rootModule.
//   state:rootModule.state,
//   _children:{
//     aCount:{
//       _raw: aModule,
//       state:aModule.state,
//       _children: {
//           cCount:{
//             _raw: cModule,
//             state:cModule.state,
//           }
//       }
//     },
//     bCount:{
//       _raw: bModule,
//       state:bModule.state,
//       _children: {
//       }
//     },
//   }
// }
