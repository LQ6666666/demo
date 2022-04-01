export function patchEvent(
    el: Element & { _vei?: any },
    rawName: string,
    prevValue: any,
    nextValue: any
) {
    // 对函数的缓存, 放到 el 的这个属性上面
    const invokers = el._vei || (el._vei = {});
    const existingInvokers = invokers[rawName];
    // 需要绑定事件，并且还存在
    if (nextValue && existingInvokers) {
        // 直接给 value 属性重新赋值就行了
        existingInvokers.value = nextValue;
    } else {
        const name = rawName.slice(2).toLowerCase();
        // 之前没有绑定事件，现在绑定
        if (nextValue) {
            const invoker = invokers[rawName] = createInvoker(nextValue);
            el.addEventListener(name, invoker);
        } else if (existingInvokers) {
            // 之前绑定了但是没有 nextValue，删除这个事件
            el.removeEventListener(name, existingInvokers);
            invokers[rawName] = void 0;
        }

    }
}


function createInvoker(initialValue: Function) {
    const invokers = (e: Event) => {
        invokers.value(e);
    }

    // 为了能随便更改 value 的值，下次直接改 value 属性就行了
    invokers.value = initialValue;
    return invokers;
}