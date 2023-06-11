// 递归中的 递阶段

import { FiberNode } from "./fiber";
import { UpdateQueue, processUpdateQueue } from "./updateQueue";
import { Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { mountChildFibers, reconcileChildFibers } from "./childFiber";
import { renderWithHooks } from "./fiberHooks";
import { Lane } from "./fiberLane";
import { Ref } from "./fiberFlags";

// 比较，返回子 fiberNode
export const beginWork = (wip: FiberNode, renderLane: Lane) => {
  // 主要标记两种结构变化的 flags: Placement ChildDeletion
  // 不包含与属性变化的 flags: Update

  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip, renderLane);

    case HostComponent:
      return updateHostComponent(wip);

    case HostText:
      return null;

    case FunctionComponent:
      return updateFunctionComponent(wip, renderLane);

    case Fragment:
      return updateFragment(wip);

    default:
      if (__DEV__) {
        console.warn("beginWork 未实现的类型");
      }
      return null;
  }

  return null;
};

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
  const nextChildren = renderWithHooks(wip, renderLane);

  reconcileChildren(wip, nextChildren);
  return wip.child;
}

/**
 * 1.计算状态的最新值
 *
 * 2.创造子 FiberNode
 */
function updateHostRoot(wip: FiberNode, renderLane: Lane) {
  const baseState = wip.memoizedState;
  const updateQueue = wip.updateQueue as UpdateQueue<Element>;
  const pending = updateQueue.shared.pending;

  updateQueue.shared.pending = null;
  const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
  wip.memoizedState = memoizedState;

  const nextChildren = wip.memoizedState;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

/**
 * 1. 创建子 FiberNode
 */
function updateHostComponent(wip: FiberNode) {
  const nextProps = wip.pendingProps;
  const nextChildren = nextProps.children;
  markRef(wip.alternate, wip);
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: any) {
  const current = wip.alternate;

  if (current === null) {
    // mount
    wip.child = mountChildFibers(wip, null, children);
  } else {
    // update
    wip.child = reconcileChildFibers(wip, current.child, children);
  }
}

function updateFragment(wip: FiberNode) {
  const nextChildren = wip.pendingProps;
  reconcileChildren(wip, nextChildren);
  return wip.child;
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
  const ref = workInProgress.ref;

  if (
    // mount 时存在 ref
    (current === null && ref !== null) ||
    // update 时 ref 引用变化
    (current !== null && current.ref !== ref)
  ) {
    // 标记 Ref
    workInProgress.flags |= Ref;
  }
}
