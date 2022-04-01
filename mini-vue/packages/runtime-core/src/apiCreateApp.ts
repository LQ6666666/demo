import { createVNode } from "./vnode";

export function createAppAPI(render: Function) {
    return function createApp(rootComponent: any, rootProps: any = null) {
        let isMounted = false;

        const app: { [key: string]: any } = {
            _component: rootComponent,
            _props: rootProps,
            _container: null,

            mount(rootContainer: Element) {
                if (isMounted) {
                    return console.warn("already mount");
                }
                // 1. 根据组件创建虚拟节点
                const vnode = createVNode(rootComponent, rootProps);

                // 2. 将虚拟节点和容器获取到之后，调用 render 函数
                render(vnode, rootContainer);

                isMounted = true;
                app._container = rootContainer;

                return {};
            }
        }


        return app;
    }
}