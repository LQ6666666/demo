import { isFunction, ShapeFlags } from '@vue3/shared';
import { initProps } from './componentProps';
import { initSlots } from './componentSlots';
import { callWithErrorHandling } from './errorHanding';
import { VNode } from './vnode';
import { isPromise, isObject, NOOP } from '../../shared/src/index';
import { PublicInstanceProxyHandlers } from './componentPublicInstance';

// 组件中所有的类
let uid = 0;
export function createComponentInstance(vnode: VNode) {
    // 组件实例
    const instance = {
        uid: uid++,
        vnode,
        type: vnode.type,
        ctx: {},
        props: {},
        attrs: {},
        slots: {},
        setupState: {},
        isMounted: false,
        isUnmounted: false,
        render: null,
        effect: null,
    }

    instance.ctx = { _: instance };

    return instance;
}

export function setupComponent(instance: any) {
    const { props, children } = instance.vnode;
    const isStateful = isStateFulComponent(instance);
    // 根据 props 解析出 attrs props 放到 instance上
    initProps(instance, props, isStateful);
    initSlots(instance, children);

    // 判断当前组件是不是有状态的组件
    const setupResult = isStateful
        // 有状态组件需要调用 setup 函数
        // 用 setup 的返回值填充 setupState 和 render 方法
        ? setupStatefulComponent(instance)
        : undefined;

    return setupResult;
}

function setupStatefulComponent(instance: any) {
    // 1. 获取当前组件
    const Component = instance.type;
    // 2. 代理传递给 render 函数的参数
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    // 3. 拿到 setup 方法
    const { setup } = Component;

    if (setup) {
        // 0. 创建 context，有用到 context 才去创建
        const setupContext = (instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null)
        // 1. 设置全局组件实例为当前组件：后面提供 getCurrentInstance 可以在 setup 中获取当前实例
        setCurrentInstance(instance);
        // 2. 调用 setup，传入参数
        const setupResult = callWithErrorHandling(setup, [instance.props, setupContext]);
        // 3. 清除全局组件实例
        unsetCurrentInstance();
        // 4. 判断返回值类型
        if (isPromise(setupResult)) {
            setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
        } else {
            // 处理 setup 返回值
            handleSetupResult(instance, setupResult);
        }
    } else {
        finishComponentSetup(instance);
    }
}

export function handleSetupResult(instance: any, setupResult: any) {
    // 如果返回值就函数，那就是 render 函数
    if (isFunction(setupResult)) {
        instance.render = setupResult;
    } else if (isObject(setupResult)) {
        // 如果是对象，就保存到 setupState 上
        instance.setupState = setupResult
    }

    finishComponentSetup(instance);
}

// 完成组件的安装
// 给 instance 绑定 render
// 可能 setup 返回的不是 render 函数
// 所以要从 template 解析或者是 options.render
export function finishComponentSetup(instance: any) {
    const Component = instance.type;
    // 如果 setup 返回的不是函数，那么 instance 现在就是 null
    if (!instance.render) {
        // 如果 options 也没有写 render 函数，那 render 就是 template 模板
        if (!Component.render) {
            // 进行模板编译：将 template 编译成 render 函数
            Component.render = null;
        }

        instance.render = Component.render || NOOP;
    }

    // 对 vue2.x 最兼容
    // applyOptions 待实现
}

/** 判断是不是有状态组件 */
export function isStateFulComponent(instance: any) {
    return (instance.vnode as VNode).shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}

export let currentInstance: any | null = null;
export function setCurrentInstance(instance: any) {
    currentInstance = instance;
}

export function getCurrentInstance() {
    return currentInstance;
}

export function unsetCurrentInstance() {
    currentInstance = null;
}

// 返回四个参数 expose emit attrs slots
export function createSetupContext(instance: any) {
    const expose = (exposed: any) => {
        instance.exposed = exposed || {};
    }

    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: () => { },
        expose,
    }
}