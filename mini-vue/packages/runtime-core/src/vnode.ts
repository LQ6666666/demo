import { isString, ShapeFlags, isArray, isObject } from '@vue3/shared';


export interface VNode {
    type: any,
    props: any,
    children: any,
    shapeFlag: number,
    component: any,
    key: null | string | symbol | number,
    el: null | Element,
    __v_isVNode: boolean,
}

// 创建虚拟节点

// h 也是调用 createVNode
export function createVNode(type: any, props: any, children: unknown = null) {
    // 根据 type 区分是组件，还是普通元素
    let shapeFlag;
    if (isString(type)) {
        shapeFlag = ShapeFlags.ELEMENT;
    } else if (isObject(type)) {
        shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
    } else {
        shapeFlag = 0;
    }

    return createBaseVNode(type, props, children, shapeFlag)
}

export function createBaseVNode(type: any, props: any, children: unknown = null, shapeFlag: number): VNode {
    // 给虚拟节点加一个类型 __v_isVNode 表示是 vnode 节点
    const vnode = {
        __v_isVNode: true,
        type,
        props,
        children,
        // 存放组件对应的实例
        component: null,
        shapeFlag,
        // diff 算法会用到 key
        key: props?.key ?? null,
        el: null,// 稍后会将虚拟节点和真实节点对应起来
    }

    // 判断 children 类型
    normalizeChildren(vnode, children);

    return vnode;
}


function normalizeChildren(vnode: any, children: unknown) {
    let type = 0;

    if (children == null) {
        children = null;
    } else if (isArray(children)) {
        type = ShapeFlags.ARRAY_CHILDREN;
    } else {
        type = ShapeFlags.TEXT_CHILDREN;
    }

    // 做一个 | 目的是为何将 children 类型和 vnode 的本身类型一起标记起来
    // 可以判断出 自己的类型和 children 的类型
    vnode.shapeFlag |= type;
}