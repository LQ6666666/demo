// 元素操作
const doc = globalThis.document;
// createElement 不同的平台创建元素方式不同

export const nodeOps = {
    // 创建
    createElement: (tag: string) => doc.createElement(tag),
    // 删除
    remove: (child: Node) => { child.parentNode?.removeChild(child); },
    // 插入
    insert: (child: Node, parent: Element, anchor: Node | null | undefined) => {
        // 如果参照物为空，则相当于 appendChild
        parent.insertBefore(child, anchor ?? null);
    },
    // 查询
    querySelector: (selector: string) => doc.querySelector,
    // 设置元素文本内容
    setElementText: (el: Element, text: string) => {
        el.textContent = text;
    },
    // 创建文本
    createText: (text: string) => doc.createTextNode(text),
    // 设置文本内容
    setText: (node: Node, text: string) => {
        node.nodeValue = text;
    },
    // 下个兄弟节点
    nextSibling: (node: Node) => node.nextSibling,
} 