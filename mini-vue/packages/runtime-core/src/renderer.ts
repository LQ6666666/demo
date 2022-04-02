import { ShapeFlags } from "@vue3/shared";
import { ReactiveEffect } from "@vue3/reactivity";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { VNode, Text, normalizeVNode } from './vnode';
import { renderComponentRoot } from "./componentRenderUtils";

export function createRenderer(options: any) {
    return baseCreateRenderer(options);
}

export function baseCreateRenderer(options: any) {
    // 告诉 core 怎么渲染
    const {
        insert: hostInsert,
        remove: hostRemove,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        createText: hostCreateText,
        setText: hostSetText,
        setElementText: hostSetElementText,
    } = options;

    const processText = (n1: VNode | null, n2: VNode, container: Element) => {
        if (n1 === null) {
            hostInsert((n2.el = hostCreateText(n2.children)), container);
        } else {
            const el = (n2.el = n1.el);
            if (n1.children !== n2.children) {
                hostSetText(el, n2.children);
            }
        }
    }

    /** patch 里面处理元素的方法 */
    const processElement = (n1: VNode | null, n2: VNode, container: Element) => {
        // 元素挂载
        if (n1 === null) {
            mountElement(n2, container)
        } else {
            // 元素更新

        }
    }

    /** 挂载元素 */
    const mountElement = (vnode: VNode, container: Element) => {
        // 递归渲染
        const { type, props, shapeFlag, children } = vnode;
        let el;
        // 1. 创建 el
        if (vnode.el) {
            // 已经有 el 了，就
            // el = vnode.el = hostCloneNode(vnode.el);
        } else {
            el = (vnode.el = hostCreateElement(vnode.type));
        }

        // 2. 判断子节点类型
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 文本
            hostSetElementText(el, children);
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el);
        }

        // 3. 处理 props
        if (props) {
            for (const key in props) {
                hostPatchProp(el, key, null, props[key]);
            }
        }

        // 4. 插入到页面上去
        hostInsert(el, container);
    }

    /** 挂载子节点，就是遍历 children 依次 patch */
    const mountChildren = (children: VNode[], container: Element) => {
        for (let i = 0; i < children.length; i++) {
            const child = normalizeVNode(children[i]);
            patch(null, child, container)
        }
    }

    /** patch 里面处理组件的方法 */
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

                // 因为 subTree 也是 vnode
                patch(null, subTree, container);

                initialVNode.el = subTree.el;

                instance.isMounted = true;
            } else {
                // 更新
                console.log("更新组件");
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
        if (n1 === n2) return;

        const { type, shapeFlag } = n2;

        switch (type) {
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 针对不同类型，做初始化操作
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container);
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // 处理组件
                    processComponent(n1, n2, container);
                }
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