import { isArray, isObject } from '@vue3/shared';
import { createVNode, isVNode, VNode } from './vnode';


export function h(type: number): VNode;
export function h(type: any, children: number): VNode;
export function h(type: any, props: number, children: number): VNode;

export function h(type: any, propsOrChildren?: any, children?: any): any {
    const l = arguments.length;
    if (l === 1) {
        return createVNode(type, null);
    } else if (l === 2) {
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                // 如果是 vnode 直接放到 children 数组中
                return createVNode(type, null, [propsOrChildren]);
            }

            return createVNode(type, propsOrChildren);
        } else {
            return createVNode(type, null, propsOrChildren);
        }
    } else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        } else if (l === 3 && isVNode(children)) {
            children = [children];
        }
    }

    // 保证 children 是数组或者是 null
    return createVNode(type, propsOrChildren, children);
}
