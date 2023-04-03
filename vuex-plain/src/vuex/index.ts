import { storeKey, useStore } from "./injectKey";
import { Store, type StoreOptions } from "./store";

/** 创建一个容器 返回一个 store */
export function createStore<S extends object>(options: StoreOptions<S>) {
  return new Store<S>(options);
}

export { useStore, storeKey };

export { Store };
