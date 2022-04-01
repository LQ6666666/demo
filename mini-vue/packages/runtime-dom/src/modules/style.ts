import { isString } from "@vue3/shared";
import { isObject } from '../../../shared/src/index';

export function patchStyle(el: Element, prev: string | null | any, next: string | null | any) {
    // 获取样式
    const style = (el as HTMLElement).style;
    const isCssString = isString(next);
    
    if (next === null) {
        el.removeAttribute("style");
    } else if (next && isCssString) {
        if (prev !== next) {
            style.cssText = next as string;
        }
    } else if (isObject(next)) {
        // 老的里：新的有没有，把老的清空
        if (prev !== null) {
            for (const key in prev) {
                if (next[key]) {
                    // 旧的有，新的没有
                    style[key as any] = "";
                }
            }
        }

        // 新的直接赋值就好了
        for (const key in next as object) {
            style[key as any] = next[key];
        }
    }
} 