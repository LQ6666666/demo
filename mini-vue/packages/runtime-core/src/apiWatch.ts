import { isReactive, isRef, ReactiveEffect } from "@vue3/reactivity";
import { currentInstance } from "./component";
import { hasOwn, isArray, isFunction, isMap, isObject, isPlainObject, isSet, NOOP, hasChanged } from '@vue3/shared';
import { callWithErrorHandling } from './errorHanding';

export interface WatchOptionsBase {
    flush?: 'pre' | 'post' | 'sync';
}

export interface WatchOptions extends WatchOptionsBase {
    immediate?: boolean;
    deep?: boolean;
}

export type WatchStopHandle = () => void;
type OnCleanup = (cleanupFn: () => void) => void;


const INITIAL_WATCHER_VALUE = {}

export function watch(source: any, cb: any, options?: WatchOptions) {
    return doWatch(source, cb, options);
}

export function watchEffect(effect: any, options?: WatchOptionsBase) {
    return doWatch(effect, null, options);
}

function doWatch(source: any, cb?: any, { immediate, deep, flush }: WatchOptions = {}) {
    // 获取当前组价实例
    const instance = currentInstance;
    let getter: () => any;
    let isMultiSource = false;

    // 判断监听数据源类型
    if (isRef(source)) {
        getter = () => source.value;
    } else if (isReactive(source)) {
        getter = () => source
        deep = true;
    } else if (isArray(source)) {
        isMultiSource = true;

        getter = () => source.map(s => {
            if (isRef(s)) {
                return s.value;
            } else if (isReactive(s)) {
                return traverse(s);
            } else if (isFunction(s)) {
                return callWithErrorHandling(s)
            } else {
                console.warn('Invalid watch source');
            }
        });
    } else if (isFunction(source)) {
        if (cb) {
            getter = () => callWithErrorHandling(source);
        } else {
            getter = () => {
                if (instance?.isUnmounted) {
                    return;
                }

                // 清除上一次的 watch
                cleanup?.();
                // watchEffect 有一个参数：取消依赖触发
                return callWithErrorHandling(source, [onCleanup])
            }
        }
    } else {
        getter = NOOP;
        console.warn('Invalid watch source');
    }

    // 深度监听
    if (cb && deep) {
        const baseGetter = getter;
        getter = () => traverse(baseGetter());
    }

    let cleanup: () => void;
    let onCleanup: OnCleanup = (fn: () => void) => {
        cleanup = effect.onStop = () => {
            callWithErrorHandling(fn);
        }
    }

    let oldValue = isMultiSource ? [] : INITIAL_WATCHER_VALUE;

    const job = () => {
        if (!effect.active) {
            return false;
        }

        if (cb) {
            const newValue = effect.run();
            // 判断两次值是否变化
            const flag = isMultiSource
                ? (newValue as any[]).some((v, i) => hasChanged(v, (oldValue as any[])[i]))
                : hasChanged(newValue, oldValue);

            if (deep || flag) {
                cleanup?.();
                callWithErrorHandling(cb, [
                    newValue,
                    // 初始化
                    oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
                    onCleanup,
                ])
            }

            oldValue = newValue;
        } else {
            // watchEffect
            effect.run();
        }
    }

    const scheduler = () => {
        job();
    };

    const effect = new ReactiveEffect(getter, scheduler);

    if (cb) {
        if (immediate) {
            job();
        } else {
            oldValue = effect.run();
        }
    } else {
        effect.run();
    }

    return () => {
        effect.stop();
        console.log(effect)
    }
}

// 依次访问属性，依赖收集
function traverse(value: unknown, seen?: Set<unknown>) {
    if (!isObject(value)) {
        return value;
    }

    seen ??= new Set();
    if (seen.has(value)) {
        return value;
    }

    if (isRef(value)) {
        traverse(value.value, seen);
    } else if (isArray(value)) {
        for (const item of value) {
            traverse(item, seen);
        }
    } else if (isSet(value) || isMap(value)) {
        value.forEach(v => {
            traverse(v, seen);
        });
    } else if (isPlainObject(value)) {
        for (const key in value) {
            if (hasOwn(value, key)) {
                traverse(value[key], seen);
            }
        }
    }

    return value;
}