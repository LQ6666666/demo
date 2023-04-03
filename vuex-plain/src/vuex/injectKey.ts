import { inject } from "vue";
import type { Store } from "./store";

export const storeKey: string | symbol = Symbol("store");

export function useStore(injectKey = storeKey) {
  return inject<Store<any>>(injectKey)!;
}
