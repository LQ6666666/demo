import { Dep, createDep } from './dep';
import { activeEffect, trackEffects, triggerEffects } from './effect';
import { toReactive } from './reactive';
import { hasChanged } from "@vue3/shared";
import { isArray } from '../../shared/src/index';

type RefBase<T> = {
    dep?: Dep
    value: T
}

export function ref(value: unknown) {
    return createRef(value, false);
}

export function shallowRef(value: unknown) {
    return createRef(value, true);
}

function createRef(value: unknown, shallow: boolean) {
    return new RefImpl(value, shallow);
}

class RefImpl<T> {
    private _value: T;
    private _rawValue: T;
    public readonly __v_isRef = true;
    public dep?: Dep = undefined;

    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._rawValue = __v_isShallow ? value : value;
        this._value = __v_isShallow ? value : toReactive(value);
    }

    get value() {
        trackRefValue(this);
        return this._value;
    }

    set value(newVal: T) {
        // 判断新值和旧只是否有变化
        if (hasChanged(newVal, this._rawValue)) {
            // 新值作为老值
            this._rawValue = newVal;
            this._value = this.__v_isShallow ? newVal : toReactive(newVal);
            triggerRefValue(this, newVal);
        }
    }
}

/** ref 依赖收集 */
export function trackRefValue(ref: RefBase<any>) {
    if (activeEffect) {
        if (ref.dep === undefined) {
            ref.dep = createDep();
        }

        trackEffects(ref.dep)
    }
}
/** ref 触发更新 */
export function triggerRefValue(ref: RefBase<any>, newVal: any) {
    if (ref.dep) {
        triggerEffects(ref.dep);
    }
}

/** 可以把一个对象的值转化成 ref */
export function toRef<T extends object, K extends keyof T>(target: T, key: K) {
    return new ObjectRefImpl(target, key);
}

// object 可能是数组或者对象
export function toRefs<T extends object>(object: T) {
    const ret: any = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        ret[key] = toRef(object, key);
    }

    return ret;
}

class ObjectRefImpl<T extends object, K extends keyof T> {
    public readonly __v_isRef = true;

    constructor(private readonly _object: T, private readonly _key: K) { }

    get value() {
        return this._object[this._key];
    }

    set value(newVal) {
        this._object[this._key] = newVal;
    }
}