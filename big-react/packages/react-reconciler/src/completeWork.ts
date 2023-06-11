// 递归中的 归阶段
// 1.对于 Host 类型的 FiberNode: 构建离屏 DOM 树
// 2.标记 Update Flag

import {
  Container,
  Instance,
  appendInitialChild,
  createInstance,
  createTextInstance
} from "hostConfig";
import { FiberNode } from "./fiber";
import { Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { NoFlags, Ref, Update } from "./fiberFlags";

export const completeWork = (wip: FiberNode) => {
  const newProps = wip.pendingProps;
  const current = wip.alternate;

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode !== null) {
        // update
        // 1.props 是否变化
        // 2.变了 Update flag
        // FiberNode.updateQueue = [className, "aaa", title, "bbb"]
        // className style
        markUpdate(wip);
        // updateFiberProps(wip.stateNode, newProps);
        // 标记 Ref
        if (current.ref !== wip.ref) {
          markRef(wip);
        }
      } else {
        // 1.构建 DOM
        const instance = createInstance(wip.type, newProps);
        // 2.将 DOM 插入到 DOM 树中
        appendAllChildren(instance, wip);
        wip.stateNode = instance;
        // 标记 Ref
        if (wip.ref !== null) {
          markRef(wip);
        }
      }
      bubbleProperties(wip);
      return null;

    case HostText:
      if (current !== null && wip.stateNode !== null) {
        // update
        const oldText = current.memoizedProps?.textContent;
        const newText = newProps.textContent;
        if (oldText !== newText) {
          markUpdate(wip);
        }
      } else {
        // 1.构建 DOM
        const instance = createTextInstance(newProps.textContent);
        wip.stateNode = instance;
      }
      bubbleProperties(wip);
      return null;

    case HostRoot:
    case FunctionComponent:
    case Fragment:
      bubbleProperties(wip);
      return null;

    default:
      if (__DEV__) {
        console.warn("未实现的 completeWork 情况", wip);
      }
      return null;
  }
};

function markUpdate(fiber: FiberNode) {
  fiber.flags |= Update;
}

function appendAllChildren(parent: Instance | Container, wip: FiberNode) {
  let node = wip.child;

  while (node !== null) {
    // 往下找
    if (node?.tag === HostComponent || node?.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === wip) {
      return;
    }

    // 往右找
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return;
      }
      node = node?.return ?? null;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

// completeWork 性能优化
// 利用 completeWork 向上遍历(归)的流程，将子 FiberNode 的 Flags 冒泡到父 FiberNode
function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags;
  let child = wip.child;

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;

    child.return = wip;
    child = child.sibling;
  }

  wip.subtreeFlags |= subtreeFlags;
}

function markRef(fiber: FiberNode) {
  fiber.flags |= Ref;
}
