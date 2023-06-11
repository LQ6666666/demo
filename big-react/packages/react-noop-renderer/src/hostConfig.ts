import { FiberNode, HostText } from "@react/react-reconciler";
import { AnyFn, Props, isFunction } from "@react/shared";

export interface Container {
  rootId: number;
  children: (Instance | TextInstance)[];
}

export interface Instance {
  id: number;
  type: string;
  children: (Instance | TextInstance)[];
  parent: number;
  props: Props;
}

export interface TextInstance {
  text: string;
  id: number;
  parent: number;
}

let instanceCount = 0;

export const createInstance = (type: string, props: Props): Instance => {
  const instance = {
    id: instanceCount++,
    type,
    props,
    children: [],
    parent: -1
  };
  return instance;
};

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
  // id
  const prevParentId = child.parent;
  const parentId = "rootId" in parent ? parent.rootId : parent.id;
  if (prevParentId !== -1 && prevParentId !== parentId) {
    throw new Error("不能重复挂载 child");
  }
  child.parent = parentId;
  parent.children.push(child);
};

export const createTextInstance = (content: string) => {
  const instance = {
    text: content,
    id: instanceCount++,
    parent: -1
  };
  return instance;
};

export const appendChildToContainer = (parent: Container, child: Instance) => {
  // id
  const prevParentId = child.parent;
  if (prevParentId !== -1 && prevParentId !== parent.rootId) {
    throw new Error("不能重复挂载 child");
  }
  child.parent = parent.rootId;
  parent.children.push(child);
};

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps?.textContent ?? "";
      return commitTextUpdate(fiber.stateNode, text);

    default:
      if (__DEV__) {
        console.warn("未实现的 Update 类型");
      }
      break;
  }
};

export const commitTextUpdate = (textInstance: TextInstance, textContent: string) => {
  textInstance.text = textContent;
};

export const removeChild = (child: Instance | TextInstance, container: Container) => {
  const index = container.children.indexOf(child);
  if (index === -1) {
    throw new Error("child 不存在");
  }
  container.children.splice(index, 1);
};

export const insertChildToContainer = (child: Instance, container: Container, before: Instance) => {
  const beforeIndex = container.children.indexOf(before);
  if (beforeIndex === -1) {
    throw new Error("before 不存在");
  }
  const index = container.children.indexOf(child);
  if (index !== -1) {
    container.children.splice(index, 1);
  }

  container.children.splice(beforeIndex, 0, child);
};

export const schedulerMicroTask = isFunction(queueMicrotask)
  ? queueMicrotask
  : isFunction(Promise)
  ? (callback: AnyFn) => Promise.resolve().then(callback)
  : setTimeout;
