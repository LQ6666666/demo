import { VNode, createVNode } from './vnode';
import { ShapeFlags } from '@vue3/shared';

export function renderComponentRoot(instance: any): VNode {
    const {
        type: Component,
        proxy,
        vnode,
        render,
        props,
        attrs, slots, emit
    } = instance;

    let result

    try {
        // 有状态组件
        if ((vnode as VNode).shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            const proxyToUse = proxy;
            result = render.call(proxyToUse, proxyToUse);
        } else {
            // 函数组件(无状态组件)
            const render = Component;
            result = render.length > 1
                ? render(props, { attrs, slots, emit })
                : render(props, null);
        }
    } catch (error: any) {
        result = createVNode("h2", null, error?.message ?? "");
    }

    let root = result;
    // 处理 attrs
    // 处理 props
    // 处理指令
    // 处理动画
    result = root;
    return result;
}