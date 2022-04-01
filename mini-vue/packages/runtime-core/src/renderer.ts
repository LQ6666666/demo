import { ShapeFlags } from "@vue3/shared";
import { createAppAPI } from "./apiCreateApp";
import { VNode } from "./vnode";

export function createRenderer(options: any) {
    return baseCreateRenderer(options);
}

export function baseCreateRenderer(options: any) {
    const processElement = () => {

    }

    const processComponent = (n1: VNode | null, n2: VNode, container: Element) => {
        // n1 为 null 组件没有上一次的虚拟节点，表示挂载组件
        if (n1 === null) {
            // 挂载组件
            mountComponent();
        } else {
            // 更新组件
            updateComponent();
        }
    }

    const mountComponent = () => {
        // 1. 创建组件实例

        // 2. 调用 setup，绑定 props slots，给 instance 绑定 render 函数等等

        // 3. 调用 render 函数
    }

    const updateComponent = () => {

    }

    const patch = (n1: VNode | null, n2: VNode, container: Element) => {
        if (n1 === n2) {
            return;
        }

        // 针对不同类型，做初始化操作
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
            // 处理元素
            processElement();
        } else if (n2.shapeFlag & ShapeFlags.COMPONENT) {
            // 处理组件
            processComponent(n1, n2, container);
        }
    }

    const render = (vnode: VNode, container: Element) => {
        // core 的核心，根据不同的虚拟节点，创建对应的真实元素
        console.log(vnode);

        // vnode === null 是卸载
        if (vnode === null) {

        } else {
            patch(null, vnode, container);
        }
    }

    return {
        render,
        createApp: createAppAPI(render)
    }
}