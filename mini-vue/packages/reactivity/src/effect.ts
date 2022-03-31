import { extend, isArray } from '@vue3/shared';
import { TrackOpTypes, TriggerOpTypes } from "./operations";
import { createDep } from './dep';
import { isIntegerKey } from '../../shared/src/index';
import { ComputedRefImpl } from './computed';

const targetMap = new WeakMap<any, any>();

// 存储当前的 effect
export let activeEffect: ReactiveEffect | undefined = void 0;
const effectStack: any[] = []

export function effect(fn: any, options: any) {
    // 这个 effect 变成响应式的 effect， 响应式数据变化，重新执行
    const _effect = new ReactiveEffect(fn);

    if (options) {
        // 保存 options
        extend(_effect, options);
    }

    // 默认的 effect 会先执行
    if (!options || !options.lazy) {
        _effect.run();
    }

    const runner: any = _effect.run.bind(_effect);
    runner.effect = _effect

    return runner;
}

export class ReactiveEffect<T = any> {
    public dep: Set<ReactiveEffect>[];
    computed?: ComputedRefImpl<T>;

    constructor(
        public fn: () => T,
        public scheduler: any | null = null
    ) {
        this.dep = [];
    }

    run() {
        // 保证 effect 没有加入到 effectStack
        if (!effectStack.includes(this)) {
            try {
                effectStack.push(this);
                activeEffect = this;
                // 函数执行的时候会取值，就会走 proxy 的 get
                return this.fn();
            } finally {
                effectStack.pop();
                activeEffect = effectStack.at(-1);
            }
        }
    }
}

// 让某个对象中的属性 收集当前它对应的 effect 函数
export function track(target: object, type: TrackOpTypes, key: unknown) {
    if (activeEffect) {
        let depsMap: Map<any, any> | undefined = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }

        let dep: Set<ReactiveEffect> | undefined = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }

        trackEffects(dep);
    }
}

export function trackEffects(dep: Set<ReactiveEffect>) {
    if (!dep.has(activeEffect!)) {
        dep.add(activeEffect!);
        activeEffect!.dep.push(dep);
    }
}

export function trigger(target: object, type: TriggerOpTypes, key: unknown, newValue: any, oldValue?: any) {
    // console.log(target, type, key, newValue, oldValue)
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }

    let effects = new Set<ReactiveEffect>();
    // 我要将所有的 effects 全部存到一个新的集合中，最终一起执行

    // 1. 看修改的是不是数组的长度， 因为改长度影响很大
    if (key === "length" && isArray(target)) {
        // 如果对应的长度，有依赖收集需要更新
        (depsMap as Map<any, Set<ReactiveEffect>>).forEach((dep, key) => {
            // 如果更改的长度，小于收集的索引，那么这个索引也需要出发 effect 重新执行
            if (key === "length" || key >= newValue) {
                if (dep) {
                    dep.forEach(effect => effects.add(effect))
                }
            }
        });
    } else {
        // 可能是对象
        const dep = depsMap.get(key);
        if (dep) {
            effects = dep;
        }

        switch (type) {
            case TriggerOpTypes.ADD:
                // 如果修改数组中某一个索引
                if (isArray(target) && isIntegerKey(key)) {
                    depsMap.get("length")?.forEach((effect: any) => effects.add(effect))
                }
        }
    }


    triggerEffects(effects);
}

export function triggerEffects(effects: Set<ReactiveEffect>) {
    effects.forEach(effect => {
        if (effect.scheduler) {
            effect.scheduler();
        } else {
            effect.run();
        }
    })
}

/**
 * effectStack：解决了这个问题
 * 函数调用是一个栈型结构
 * 
 * effect(() => {
 *  state.name = xxx
 *      effect(() => {
 *          state.age = xxx
 *      })
 *  state.address = xxx
 * })
 */