// runtime=-dom 核心就是 提供了 DOM API 方法
// 操作节点、操作属性更新

import { extend, isString } from "@vue3/shared";
import { createRenderer } from "@vue3/runtime-core";
import { patchProp } from './patchProp';
import { nodeOps } from './nodeOps';

// 渲染时用到的所有方法
const rendererOptions = extend({ patchProp }, nodeOps);

// 用户调用的是 runtime-dom -> runtime-core
// runtime-dom 是为了解决平台差异的

export interface Renderer {
    render: any
    createApp: any
}

// vue 中 runtime-core 提供了核心的方法，用来处理渲染
// 他会使用 runtime-dom 中的 api 进行渲染
export function createApp(...args: any[]) {
    const app = ensureRenderer().createApp(...args);

    const { mount } = app;

    app.mount = (containerOrSelector: Element | string) => {
        // 对传入的 containerOrSelector 做处理
        const container = normalizeContainer(containerOrSelector);
        if (container === null) return;

        // 在 mount 之前清空容器
        container.innerHTML = "";

        // 将逐渐渲染换成 DOM 元素进行挂载
        // 调用原来的 mount 函数
        mount(container);
    }

    return app;
}

let renderer: Renderer;
function ensureRenderer(): Renderer {
    if (!renderer) {
        // 告诉 core 怎么渲染
        renderer = createRenderer(rendererOptions) as Renderer;
    }

    return renderer;
}

function normalizeContainer(container: Element | string): Element | null {
    if (isString(container)) {
        const res = document.querySelector(container);

        return res;
    }

    return container;
}

export * from '@vue3/runtime-core'