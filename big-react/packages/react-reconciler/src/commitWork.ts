import {
  Container,
  Instance,
  appendChildToContainer,
  commitUpdate,
  insertChildToContainer,
  removeChild
} from "hostConfig";
import { FiberNode } from "./fiber";
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
  Passive as PassiveEffect,
  Flags,
  LayoutMask,
  Ref
} from "./fiberFlags";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { FiberRootNode } from "./fiberRoot";
import { FunctionComponentUpdateQueue } from "./fiberHooks";
import { isFunction } from "@react/shared";

let nextEffect: FiberNode | null = null;

export const commitEffects = (
  // @ts-ignore
  phrase: "mutation" | "layout",
  mask: Flags,
  callback: (fiber: FiberNode, root: FiberRootNode) => void
) => {
  return (finishedWork: FiberNode, root: FiberRootNode) => {
    nextEffect = finishedWork;

    while (nextEffect !== null) {
      // 向下遍历
      const child: FiberNode | null = nextEffect.child;

      // 第一个没有 subtreeFlags 的 FiberNode, 这个 FiberNode 在下轮就会走到 else
      if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
        nextEffect = child;
      } else {
        // 向上遍历 DFS
        while (nextEffect !== null) {
          callback(nextEffect, root);
          const sibling: FiberNode | null = nextEffect.sibling;

          if (sibling !== null) {
            nextEffect = sibling;
            break;
          }

          nextEffect = nextEffect.return;
        }
      }
    }
  };
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode, root: FiberRootNode) => {
  // console.log("commitMutationEffectsOnFiber");

  const { flags, tag } = finishedWork;

  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork);
    // 移除 flag
    finishedWork.flags &= ~Placement;
  }

  // flags Update
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork);
    // 移除 flag
    finishedWork.flags &= ~Update;
  }

  // flags ChildDeletion
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions;
    if (deletions !== null) {
      deletions.forEach(childToDelete => {
        commitDeletion(childToDelete, root);
      });
    }
    // 移除 flag
    finishedWork.flags &= ~ChildDeletion;
  }

  if ((flags & PassiveEffect) !== NoFlags) {
    // 收集回调
    commitPassiveMountEffects(finishedWork, root);
    finishedWork.flags &= ~PassiveEffect;
  }

  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    // 解绑的 Ref
    safelyDetachRef(finishedWork);
  }
};

export const commitMutationEffects = commitEffects(
  "mutation",
  MutationMask | PassiveEffect,
  commitMutationEffectsOnFiber
);

const commitLayoutEffectsOnFiber = (
  finishedWork: FiberNode,
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  root: FiberRootNode
) => {
  const { flags, tag } = finishedWork;

  if ((flags & Ref) !== NoFlags && tag === HostComponent) {
    // 绑定新的 Ref
    safelyAttachRef(finishedWork);
    // 移除 flag
    finishedWork.flags &= ~Ref;
  }
};

export const commitLayoutEffects = commitEffects("layout", LayoutMask, commitLayoutEffectsOnFiber);

function commitPassiveUnmountEffects(fiber: FiberNode, root: FiberRootNode) {
  if (fiber.tag !== FunctionComponent) {
    return;
  }
  const updateQueue = fiber.updateQueue as FunctionComponentUpdateQueue<any>;
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null) {
      if (__DEV__) {
        console.error("当前 FunctionComponent 存在 PassiveEffect 时, 应该存在 effect");
      }
    }
    root.pendingPassiveEffects.unmount.push(updateQueue.lastEffect!);
  }
}

function commitPassiveMountEffects(fiber: FiberNode, root: FiberRootNode) {
  if (fiber.tag !== FunctionComponent || (fiber.flags & PassiveEffect) === NoFlags) {
    return;
  }
  const updateQueue = fiber.updateQueue as FunctionComponentUpdateQueue<any>;
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null) {
      if (__DEV__) {
        console.error("当前 FunctionComponent 存在 PassiveEffect 时, 应该存在 effect");
      }
    }
    root.pendingPassiveEffects.update.push(updateQueue.lastEffect!);
  }
}

/**
 * 对于`FunctionComponent`需要处理`useEffect unmount`的执行、解绑`ref`
 *
 * 对于`HostComponent`需要解绑`ref`
 *
 * 对于子树的`根HostComponent`，需要移除DOM
 */
function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
  const rootChildrenToDelete: FiberNode[] = [];

  // 递归子树
  commitNestedComponent(childToDelete, unmountFiber => {
    switch (unmountFiber.tag) {
      case HostComponent:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        // 组件解绑 Ref
        safelyDetachRef(unmountFiber);
        return;

      case HostText:
        recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
        return;
      case FunctionComponent:
        commitPassiveUnmountEffects(unmountFiber, root);
        return;
      default:
        if (__DEV__) {
          console.warn("未实现的 unmount 类型", unmountFiber);
        }
        break;
    }
  });

  // 移除 rootHostNode 的 DOM
  if (rootChildrenToDelete.length) {
    const hostParent = getHostParent(childToDelete);
    if (hostParent !== null) {
      rootChildrenToDelete.forEach(node => {
        removeChild(node.stateNode, hostParent);
      });
    }
  }

  childToDelete.return = null;
  childToDelete.child = null;
}

function recordHostChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
  // 1.找到第一个 root host 节点
  const lastOne = childrenToDelete[childrenToDelete.length - 1];
  if (!lastOne) {
    childrenToDelete.push(unmountFiber);
  } else {
    let node = lastOne.sibling;
    while (node !== null) {
      if (unmountFiber === node) {
        childrenToDelete.push(unmountFiber);
      }
      node = node.sibling;
    }
  }
  // 2.每找到一个 host 节点, 判断下这个是不是 1 找到的那个节点的兄弟节点
}

function commitNestedComponent(root: FiberNode, onCommitUnmount: (fiber: FiberNode) => void) {
  let node = root;
  while (true) {
    onCommitUnmount(node);

    if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === root) {
      // 终止条件
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return;
      }
      // 向上归
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn("执行 Placement 操作", finishedWork);
  }
  // parent DOM
  const hostParent = getHostParent(finishedWork);

  // host sibling
  const sibling = getHostSibling(finishedWork);

  // finishedWork ~~ DOM append parent DOM
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling ?? undefined);
  }
};

function getHostSibling(fiber: FiberNode): Instance | null {
  let node: FiberNode = fiber;

  while (true) {
    // 向上遍历
    while (node.sibling === null) {
      // 如果当前节点没有 sibling，则找他父级 sibling
      const parent = node.return;
      // 终止条件
      if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
        return null;
      }
      node = parent;
    }

    node.sibling.return = node.return;
    node = node.sibling;

    // 不是 DOM 元素
    while (node.tag !== HostText && node.tag !== HostComponent) {
      // 向下遍历
      if ((node.flags & Placement) !== NoFlags) {
        // 这个节点本身就在移动，不能作为参照物
        continue;
      }

      if (node.child === null) {
        continue;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode;
    }
  }
}

function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return;
  while (parent) {
    const parentTag = parent.tag;
    // HostComponent
    if (parentTag === HostComponent) {
      return parent.stateNode as Container;
    }

    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).containerInfo;
    }

    parent = parent.return;
  }

  if (__DEV__) {
    console.warn("未找到 host parent", fiber);
  }

  return null;
}

function insertOrAppendPlacementNodeIntoContainer(
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance
) {
  // fiber host
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(finishedWork.stateNode, hostParent, before);
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode);
    }

    return;
  }

  const child = finishedWork.child;
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent);
    let sibling = child.sibling;
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
      sibling = sibling.sibling;
    }
  }
}

/** layout 阶段绑定 Ref */
function safelyAttachRef(fiber: FiberNode) {
  const ref = fiber.ref;
  if (ref !== null) {
    const instance = fiber.stateNode;
    if (isFunction(ref)) {
      ref(instance);
    } else {
      ref.current = instance;
    }
  }
}

/** mutation 阶段解绑 Ref */
function safelyDetachRef(current: FiberNode) {
  const ref = current.ref;
  if (ref !== null) {
    if (isFunction(ref)) {
      ref(null);
    } else {
      ref.current = null;
    }
  }
}
