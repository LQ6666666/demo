import { FiberNode, HostComponent, HostText } from "@react/react-reconciler";
import { DOMElement, updateFiberProps } from "./SyntheticEvent";
import { AnyFn, Props, isFunction } from "@react/shared";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, props: Props): Instance => {
  const element = document.createElement(type) as unknown as DOMElement;
  updateFiberProps(element, props);
  return element;
};

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
  parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
  return document.createTextNode(content);
};

export const appendChildToContainer = appendInitialChild;

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps?.textContent ?? "";
      return commitTextUpdate(fiber.stateNode, text);
    case HostComponent:
      return updateFiberProps(fiber.stateNode, fiber.memoizedProps);
    default:
      if (__DEV__) {
        console.warn("未实现的 Update 类型");
      }
      break;
  }
};

export const commitTextUpdate = (textInstance: TextInstance, textContent: string) => {
  textInstance.textContent = textContent;
};

export const removeChild = (child: Instance | TextInstance, container: Container) => {
  container.removeChild(child);
};

export const insertChildToContainer = (child: Instance, container: Container, before: Instance) => {
  container.insertBefore(child, before);
};

export const schedulerMicroTask = isFunction(queueMicrotask)
  ? queueMicrotask
  : isFunction(Promise)
  ? (callback: AnyFn) => Promise.resolve().then(callback)
  : setTimeout;
