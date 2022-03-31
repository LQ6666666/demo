import { extend, isObject, isArray, isIntegerKey, hasOwn, hasChanged } from "@vue3/shared";
import { readonly, reactive, ReactiveFlags, shallowReadonlyMap, readonlyMap, shallowReactiveMap, reactiveMap, } from './reactive';
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operations";

// 实现 new Proxy(target, handler)

// 是不是只读的，只读的 set 时会报异常
// 是不是深度的
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const set = createSetter();
const shallowSet = createSetter();

// 拦截获取
function createGetter(isReadonly = false, shallow = false) {
    return function get(target: object, key: string | symbol, receiver: object) {
        // key 为 ReactiveFlags.RAW 时，返回原对象
        if (key === ReactiveFlags.RAW && receiver ===
            (isReadonly
                ? shallow
                  ? shallowReadonlyMap
                  : readonlyMap
                : shallow
                  ? shallowReactiveMap
                  : reactiveMap
            ).get(target)) {
            return target;
        }
        // 后续 Object 上的方法会被迁移到 Reflect 上
        // target[key] = value 可能会失败， Reflect 具有返回值
        const res = Reflect.get(target, key, receiver);

        if (!isReadonly) {
            // 收集依赖，等待数据变化更新对应的视图
            track(target, TrackOpTypes.GET, key);
        }

        if (shallow) {
            return res;
        }

        // vue2 是一上来就递归， vue 是取值时才会进行代理，vue 是懒代理
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }

        return res;
    }
}

// 拦截设置
function createSetter(shallow = false) {
    return function set(target: object, key: string | symbol, value: unknown, receiver: object) {
        // 获取旧的值
        const oldValue = (target as any)[key];

        const hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);

        const result = Reflect.set(target, key, value, receiver);

        if (!hadKey) {
            // 新增
            trigger(target, TriggerOpTypes.ADD, key, value);
        } else if (hasChanged(oldValue, result)) {
            // 修改
            trigger(target, TriggerOpTypes.SET, key, value, oldValue);
        }

        return result;
    }
}

export const mutableHandlers: ProxyHandler<object> = {
    get,
    set,
}

export const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
}

export const readonlyHandlers: ProxyHandler<object> = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    }
}

export const shallowReadonlyHandlers = extend(
    {},
    readonlyHandlers,
    { get: shallowReadonlyGet }
);