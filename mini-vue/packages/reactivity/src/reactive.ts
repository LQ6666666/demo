import { isObject } from "@vue3/shared";
import {
    mutableHandlers,
    shallowReactiveHandlers,
    readonlyHandlers,
    shallowReadonlyHandlers
} from "./baseHandlers";

const reactiveMap = new WeakMap();
const shallowReactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();

export function reactive(target: any) {
    return createReactiveObject(target, false, mutableHandlers, reactiveMap);
}

export function shallowReactive(target: any) {
    return createReactiveObject(target, false, shallowReactiveHandlers, shallowReactiveMap);
}

export function readonly(target: any) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
}

export function shallowReadonly(target: any) {
    return createReactiveObject(target, false, shallowReadonlyHandlers, shallowReadonlyMap);
}

// 是不是仅读
// 是不是深度
// 柯里化
// new Proxy() 最核心的需要拦截，数据的读取和数据的修改 get set
export function createReactiveObject(target: any, isReadonly: boolean, baseHandlers: any, proxyMap: WeakMap<any, any>) {
    // 如果目标不是对象吗没法拦截， reactiveAPI 只能拦截对象类型 
    if (!isObject(target)) {
        return target;
    }

    // 如果某个对象已经被代理过了，就不要再次代理了
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        // 将获取到的 代理对象直接返回即可
        return existingProxy;
    }
    // 可能一个对象 被代理是深度代理，或者是只读代理
    const proxy = new Proxy(target, baseHandlers);

    return proxy;
}


export const toReactive = <T extends unknown>(value: T): T =>
    isObject(value) ? reactive(value) : value;