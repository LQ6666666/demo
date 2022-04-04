import { invokeArrayFns, ShapeFlags } from "@vue3/shared";
import { ReactiveEffect } from "@vue3/reactivity";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { VNode, Text, normalizeVNode, isSameVNodeType } from './vnode';
import { renderComponentRoot } from "./componentRenderUtils";
import { queueJob } from "./scheduler";

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
        nextSibling: hostNextSibling,
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
    const processElement = (n1: VNode | null, n2: VNode, container: Element, anchor: Element | null = null) => {
        // 元素挂载
        if (n1 === null) {
            mountElement(n2, container, anchor)
        } else {
            // 元素更新
            patchElement(n1, n2);
        }
    }

    /** 挂载元素 */
    const mountElement = (vnode: VNode, container: Element, anchor: Element | null = null) => {
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
        hostInsert(el, container, anchor);
    }

    /** 比较元素差异 */
    const patchElement = (n1: VNode, n2: VNode) => {
        // 元素的类型相同
        const el = (n2.el = n1.el!);
        // console.log(n1, n2, container);

        // 更新子节点
        patchChildren(n1, n2, el);

        // 更新 props
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        patchProps(el, n2, oldProps, newProps);
    }

    /** 比较 props */
    const patchProps = (el: Element, vnode: VNode, oldProps: any, newProps: any) => {
        if (oldProps === newProps) {
            return;
        }

        for (const key in newProps) {
            const prev = oldProps[key];
            const next = newProps[key];
            if (prev === next) continue;

            hostPatchProp(el, key, prev, next);
        }

        for (const key in oldProps) {
            if (!newProps[key]) {
                hostPatchProp(el, key, oldProps[key], null);
            }
        }
    }

    /** 挂载子节点，就是遍历 children 依次 patch */
    const mountChildren = (children: VNode[], container: Element) => {
        for (let i = 0; i < children.length; i++) {
            const child = normalizeVNode(children[i]);
            patch(null, child, container)
        }
    }

    const patchChildren = (n1: VNode, n2: VNode, container: Element) => {
        const c1 = n1.children;
        const c2 = n2.children;

        const prevShapeFlag = n1.shapeFlag ?? 0;
        const shapeFlag = n2.shapeFlag;
        // 新的子节点是文本
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧的是数组
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 如果 旧的里面有组件的可能
                unmountChildren(c1);
            }
            // 两个人都是文本
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        } else {
            // 现在是元素，上一次不知道是啥
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 上一个是数组
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 新旧都是数组: diff
                    patchKeyedChildren(c1, c2, container);
                } else {
                    unmountChildren(c1);
                }
            } else {
                // 旧的是 null 或者 字符串
                // 新的是字符串或者 null
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(container, "");
                }

                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    mountChildren(c2, container);
                }
            }
        }

        // 1.新的有值，旧的没值
        // 2.旧的有值，新的没值
        // 3.新旧都有值，切是数组
        // 4.新旧是字符串
    }

    // diff 算法，比较两个子元素数组
    const patchKeyedChildren = (c1: VNode[], c2: VNode[], container: Element) => {
        let i = 0;
        let l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;

        // 1. 从头开始比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = normalizeVNode(c2[i]) as VNode;
            // 是相似节点，继续 patch
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container);
            } else {
                break;
            }
            i++;
        }

        // 2. 从尾部开始比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = normalizeVNode(c2[e2]) as VNode;
            // 是相似节点，继续 patch
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container);
            } else {
                break;
            }
            e1--;
            e2--;
        }

        // 3. 新节点比旧节点多，挂载
        if (i > e1) {
            if (i <= e2) {
                while (i <= e2) {
                    const nextPos = e2 + 1;
                    const anchor = nextPos > l2 ? null : c2[nextPos].el;
                    patch(null, normalizeVNode(c2[i]), container, anchor);
                    i++;
                }
            }
        } else if (i > e2) {
            // 4. 旧的比新的节点多，卸载
            while (i <= e1) {
                unmount(c1[i]);
                i++;
            }
        } else {
            // 
            let s1 = i;
            let s2 = i;

            // 用新的做映射表
            const keyToNewIndexMap = new Map<string | number | symbol, number>();
            for (let i = s2; i <= e2; i++) {
                const nextChild = normalizeVNode(c2[i]) as VNode;
                if (nextChild.key !== null) {
                    keyToNewIndexMap.set(nextChild.key, i);
                }
            }

            let toBePatched = e2 - s2 + 1;
            const newIndexToOldIndexMap = (new Array<number>(toBePatched)).fill(0);

            // 去老的里面查找，看看有没有可以复用的
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                let newIndex;
                if (prevChild.key) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                // 在新的里面找不到旧的，直接删掉就行了
                if (newIndex == undefined) {
                    unmount(prevChild)
                } else {
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container);
                }
            }
            // 最后移动节点，并且将新增的节点插入
            // console.log(toBePatched);
            // console.log(newIndexToOldIndexMap);
            const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
            let j = increasingNewIndexSequence.length - 1;// 取出最后一个人的索引

            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = s2 + i;
                const nextChild = c2[nextIndex];
                // 参照物
                const anchor = nextIndex + 1 > l2 ? null : c2[nextIndex + 1].el;

                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, anchor);
                } else {
                    // [1,2,3,4,5,6]
                    // [1,6,2,3,4,5]
                    // 这种操作，需要将节点全部移动一遍

                    // 最长递增子序列（优化）
                    if (i !== increasingNewIndexSequence[j]) {
                        hostInsert(nextChild.el, container, anchor);
                    } else {
                        j++;
                    }
                }
            }
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
                const { bm, m } = instance;
                if (bm) {
                    invokeArrayFns(bm);
                }
                // 在这个里面调用 render，不知道组件里面是啥，所以继续 patch
                const subTree = (instance.subTree = renderComponentRoot(instance));

                // 因为 subTree 也是 vnode
                patch(null, subTree, container);

                initialVNode.el = subTree.el;

                if (m) {
                   // mounted 必须要求在我们之间完成后才会调用 (暂不考虑子组件)
                   invokeArrayFns(m);
                }

                instance.isMounted = true;
            } else {
                const { bu, u } = instance;

                if (bu) {
                    invokeArrayFns(bu);
                }

                // 更新，再去调用 render 方法
                const nextTree = renderComponentRoot(instance);
                const prevTree = instance.subTree;
                instance.subTree = nextTree;

                patch(prevTree, nextTree, container);
            
                if (u) {
                    // update 必须要求在我们之间完成后才会调用 
                   invokeArrayFns(u);
                 }
            }
        }

        const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => {
            // 源码这里传入 scheduler 是为了加入任务队列的处理
            // 自定义更新流程，降低更新频率
            queueJob(instance.update);
        }));

        const update: any = (instance.update = effect.run.bind(effect));
        update.id = instance.uid;

        update();
    }

    const unmount = (vnode: VNode) => {
        const { shapeFlag, el } = vnode;
        // 判断卸载类型
        if (shapeFlag & ShapeFlags.COMPONENT) {
            console.log("component unmount");
        } else {
            hostRemove(el);
        }
    }

    const unmountChildren = (children: VNode[]) => {
        for (const child of children) {
            unmount(child);
        }
    }

    const getNextHostNode = (vnode: VNode): Element | null => {
        if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
            return getNextHostNode(vnode.component!.subTree);
        }

        return hostNextSibling(vnode.el);
    }

    const patch = (n1: VNode | null, n2: VNode, container: Element, anchor: Element | null = null) => {
        if (n1 === n2) return;

        // 比较 vnode type 类型是否一样,如果不一致直接走 挂载
        if (n1 && !isSameVNodeType(n1, n2)) {
            // 找到旧节点的位置
            anchor = getNextHostNode(n1);
            unmount(n1);
            n1 = null;
        }

        const { type, shapeFlag } = n2;

        switch (type) {
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 针对不同类型，做初始化操作
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 处理元素
                    processElement(n1, n2, container, anchor);
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


// TODO: 最长递增序列没看懂
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr: number[]): number[] {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
        const arrI = arr[i]
        if (arrI !== 0) {
            j = result[result.length - 1]
            if (arr[j] < arrI) {
                p[i] = j
                result.push(i)
                continue
            }
            u = 0
            v = result.length - 1
            while (u < v) {
                c = (u + v) >> 1
                if (arr[result[c]] < arrI) {
                    u = c + 1
                } else {
                    v = c
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1]
                }
                result[u] = i
            }
        }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
        result[u] = v
        v = p[v]
    }
    return result
}