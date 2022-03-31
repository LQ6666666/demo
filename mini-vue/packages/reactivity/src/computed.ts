import { isFunction, NOOP } from "@vue3/shared";
import { ReactiveEffect } from './effect';
import { ReactiveFlags, toRaw } from './reactive';
import { triggerRefValue, trackRefValue } from './ref';

export type ComputedGetter<T> = (...args: any[]) => T;
export type ComputedSetter<T> = (v: T) => void;

export function computed<T>(getterOrOptions: any) {
    let getter: ComputedGetter<T>;
    let setter: ComputedSetter<T>;
    // 是不是只传了 getter 方法
    const onlyGetter = isFunction(getterOrOptions);

    if (onlyGetter) {
        getter = getterOrOptions;
        setter = NOOP;
    } else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }

    return new ComputedRefImpl(getter, setter, onlyGetter);
}

export class ComputedRefImpl<T> {
    private _value!: T;
    public readonly effect: ReactiveEffect<T>;
    public readonly [ReactiveFlags.IS_READONLY]: boolean;
    // _dirty：记录依赖是否变化
    public _dirty = true;

    constructor(
        getter: ComputedGetter<T>,
        private readonly _setter: ComputedSetter<T>,
        isReadonly: boolean
    ) {
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
                triggerRefValue(this);
            }
        });

        this.effect.computed = this;
        this[ReactiveFlags.IS_READONLY] = isReadonly;
    }

    get value() {
        const self = toRaw(this);
        trackRefValue(self);
        // _dirty 为 true 是依赖变化了，现在收集完了，设置为 false
        if (self._dirty) {
            self._dirty = false;
            // 计算结果
            self._value = self.effect.run()!;
        }

        return self._value;
    }

    set value(newValue: T) {
        this._setter(newValue);
    }
}