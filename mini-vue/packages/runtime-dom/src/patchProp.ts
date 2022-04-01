// 这个里面针对的是属性操作，一系列的属性操作
import { isOn } from "@vue3/shared";
import { patchAttr } from "./modules/attrs";
import { patchClass } from './modules/class';
import { patchEvent } from './modules/events';
import { patchStyle } from "./modules/style";

export const patchProp = (el: Element, key: string, prevValue: any, nextValue: any) => {
    if (key === "class") {
        patchClass(el, nextValue);
    } else if (key === "style") {
        patchStyle(el, prevValue, nextValue);
    } else if (isOn(key)) {
        // 是不是事件
        patchEvent(el, key, prevValue, nextValue);
    } else {
        // 剩下的都是属性
        patchAttr(el, key, nextValue);
    }
}