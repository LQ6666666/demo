import { type AnyFn } from "@react/shared";

let syncQueue: AnyFn[] | null = null;
/** 当前是否正在冲洗(执行)队列 */
let isFlushingSyncQueue = false;

export function schedulerSyncCallback(callback: AnyFn) {
  if (syncQueue === null) {
    syncQueue = [callback];
  } else {
    syncQueue.push(callback);
  }
}

export function flushSyncCallbacks() {
  if (!isFlushingSyncQueue && syncQueue) {
    isFlushingSyncQueue = true;
    try {
      syncQueue.forEach(cb => cb());
    } catch (error) {
      if (__DEV__) {
        console.error("flushSyncCallbacks 出错", error);
      }
    } finally {
      isFlushingSyncQueue = false;
      syncQueue = null;
    }
  }
}
