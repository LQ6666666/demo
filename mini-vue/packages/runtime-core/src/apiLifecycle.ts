import { currentInstance, LifecycleHooks, setCurrentInstance, unsetCurrentInstance } from './component';

// 柯里化
export const createHook = <T extends Function = () => any>(lifecycle: LifecycleHooks) =>
    (hook: T, target: any = currentInstance) => injectHook(lifecycle, hook, target)

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)

export function injectHook(type: LifecycleHooks, hook: Function, target: any) {
    if (!target) {
        console.warn("injection APIs can only be used during execution of setup()")
    }

    const wrappedHook = () => {
        setCurrentInstance(target);
        let res;
        try {
            res = hook(target);
        } catch (error) {
            console.error(error);
        }
        unsetCurrentInstance();
        return res;
    }

    const hooks = (target[type] || (target[type] = []));
    hooks.push(wrappedHook);

    return wrappedHook;
}
