import { ShapeFlags } from "@vue3/shared";
import { ReactiveEffect } from "@vue3/reactivity";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { VNode } from "./vnode";
import { renderComponentRoot } from "./componentRenderUtils";

export function createRenderer(options: any) {
    return baseCreateRenderer(options);
}

export function baseCreateRenderer(options: any) {
    const processElement = (n1: VNode | null, n2: VNode, container: Element) => {
        // const el = (n2.el = n1.el)
    }

    const processComponent = (n1: VNode | null, n2: VNode, container: Element) => {
        // n1 为 null 组件没有上一次的虚拟节点，表示挂载组件
        if (n1 === null) {
            // 挂载组件
            mountComponent(n2, container);
        } else {
            // 更新组件
            updateComponent();
        }
    }

    /** 挂载组件 */
    const mountComponent = (initialVNode: VNode, container: Element) => {
        // 组件的渲染流程
        // 1. 创建组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode));

        // 2. 将需要的数据解析到实例上面，调用 setup，绑定 props slots，给 instance 绑定 render 函数等等
        setupComponent(instance);

        // 4. 创建一个 effect 在里面调用 render 函数进行渲染
        setupRenderEffect(instance, initialVNode, container)
    }

    /** 更新组件 */
    const updateComponent = () => {

    }

    /** 创建 effect 在里面调用 组件的 render 函数 */
    const setupRenderEffect = (instance: any, initialVNode: VNode, container: Element) => {
        const componentUpdateFn = () => {
            // 初次渲染
            if (!instance.isMounted) {
                // 在这个里面调用 render，不知道组件里面是啥，所以继续 patch
                const subTree = (instance.subTree = renderComponentRoot(instance));

                console.log(subTree)
                // 因为 subTree 也是 vnode
                patch(null, subTree, container);

                initialVNode.el = subTree.el;

                instance.isMounted = true;
            } else {
                // 更新
            }
        }

        const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => {
            // 源码这里传入 scheduler 是为了加入任务队列的处理，等待调用
            instance.update();
        }));

        const update = (instance.update = effect.run.bind(effect));
        update();
    }

    const patch = (n1: VNode | null, n2: VNode, container: Element) => {
        if (n1 === n2) {
            return;
        }

        // 针对不同类型，做初始化操作
        if (n2.shapeFlag & ShapeFlags.ELEMENT) {
            // 处理元素
            processElement(n1, n2, container);
        } else if (n2.shapeFlag & ShapeFlags.COMPONENT) {
            // 处理组件
            processComponent(n1, n2, container);
        }
    }

    const render = (vnode: VNode, container: Element) => {
        // core 的核心，根据不同的虚拟节点，创建对应的真实元素
        // console.log(vnode);

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