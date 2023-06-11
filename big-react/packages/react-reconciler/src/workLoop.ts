import { schedulerMicroTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitLayoutEffects, commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { FiberNode, createWorkInProgress } from "./fiber";
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlags";
import {
  Lane,
  NoLane,
  SyncLane,
  getHighestPriorityLane,
  lanesToSchedulerPriority,
  markRootFinished,
  mergeLanes
} from "./fiberLane";
import { FiberRootNode, PendingPassiveEffects } from "./fiberRoot";
import { flushSyncCallbacks, schedulerSyncCallback } from "./syncTaskQueue";
import { HostRoot } from "./workTags";
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_NormalPriority as NormalPriority,
  unstable_shouldYield as shouldYield,
  unstable_cancelCallback,
  type CallbackNode
} from "scheduler";
import { HasEffect as HookHasEffect, HookFlags, Passive as HookPassive } from "./hookEffectTags";
import { Effect } from "./fiberHooks";
import { isFunction } from "@react/shared";

let workInProgress: FiberNode | null = null;
// 本次更新的 lane
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffect = false;

/** 退出更新状态 */
type RootExitStatus = number;
/** 中断没有执行完成 */
const RootInComplete: RootExitStatus = 1;
/** 执行完成 */
const RootCompleted: RootExitStatus = 2;
// TODO 执行过程中报错

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  root.finishedLane = NoLane;
  root.finishedWork = null;
  // root.current 指向的就是 HostRootFiber 当前页面上展示的 fiber 树
  // 生成 hostRootFiber 的 WorkInProgress 的 hostRootFiber
  workInProgress = createWorkInProgress(root.current, {});
  wipRootRenderLane = lane;
}

// 连接 UpdateQueue 和 render 方法
export function schedulerUpdateQueueOnFiber(fiber: FiberNode, lane: Lane) {
  // TODO 调度功能
  // FiberRootNode
  const root = markUpdateFromFiberToRoot(fiber);
  if (root) {
    markRootUpdated(root, lane);
    ensureRootIsScheduled(root);
  }
}

// scheduler 阶段入口
// 保证 root 被调度, 直到 lane 为 NoLane, 否则一直取优先级调度
function ensureRootIsScheduled(root: FiberRootNode) {
  // 实现判断机制, 选出一个 lane
  const updateLane = getHighestPriorityLane(root.pendingLanes);
  const existingCallback = root.callbackNode;

  // 没有 lane 就是没有更新
  if (updateLane === NoLane) {
    if (existingCallback != null) {
      unstable_cancelCallback(existingCallback);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const curPriority = updateLane;
  const prevPriority = root.callbackPriority;

  // 优先级相同
  if (curPriority === prevPriority) {
    return;
  }

  // 有更高的优先级
  if (existingCallback) {
    // 取消之前的调度回调函数
    unstable_cancelCallback(existingCallback);
  }
  let newCallbackNode: CallbackNode | null = null;

  if (__DEV__) {
    console.log(`在${updateLane === SyncLane ? "微" : "宏"}任务中调度, 优先级: ${updateLane}`);
  }

  if (updateLane === SyncLane) {
    // 同步优先级 用微任务调度
    // 触发更新就, 加入到同步队列
    schedulerSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
    // 微任务调度执行
    schedulerMicroTask(flushSyncCallbacks);
  } else {
    // 其他优先级 用宏任务调度
    const schedulerPriority = lanesToSchedulerPriority(updateLane);
    newCallbackNode = scheduleCallback(
      schedulerPriority,
      performConcurrentWorkOnRoot.bind(null, root)
    );
  }

  root.callbackNode = newCallbackNode;
  root.callbackPriority = curPriority;
}

// 记录 lane 到 FiberRootNode
function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

// 从这个 fiber 向上找到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
  let node = fiber;
  let parent = node.return;
  while (parent !== null) {
    node = parent;
    parent = node.return;
  }

  if (node.tag === HostRoot) {
    return node.stateNode;
  }

  return null;
}
/** 异步可中断 */
// 时间切片
// 高优先级打断低优先级
function performConcurrentWorkOnRoot(root: FiberRootNode, didTimeout: boolean): any {
  // useEffect 执行可能会触发更新, 更新的优先级
  // 保证 useEffect 的回调都已经执行了
  const curCallback = root.callbackNode;
  const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
  if (didFlushPassiveEffect) {
    // 当前 useEffect 触发的更新比当前的更新的优先级高
    // 改变了 callbackNode
    if (root.callbackNode !== curCallback) {
      return null;
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes);
  if (lane === NoLane) return;

  const curCallbackNode = root.callbackNode;

  // 需要同步
  const needSync = lane === SyncLane || didTimeout;
  // render 阶段
  const exitStatus = renderRoot(root, lane, !needSync);

  ensureRootIsScheduled(root);

  if (exitStatus === RootInComplete) {
    // 中断
    if (root.callbackNode !== curCallbackNode) {
      // 表示有更高优先级的任务插入
      return null;
    }

    // 返回 performConcurrentWorkOnRoot 继续调度, 在下一个时间切片执行
    return performConcurrentWorkOnRoot.bind(null, root);
  }

  // exitStatus 是完成状态
  if (exitStatus === RootCompleted) {
    // 生成 wip FiberNode 树
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = lane;
    wipRootRenderLane = NoLane;

    // wip FiberNode 树中的 flags
    commitRoot(root);
  } else {
    if (__DEV__) {
      console.error("还未实现并发更新结束状态");
    }
  }
}

/** 同步不可打断 */
function performSyncWorkOnRoot(root: FiberRootNode) {
  const nextLanes = getHighestPriorityLane(root.pendingLanes);

  if (nextLanes !== SyncLane) {
    // 其他比 SyncLAne 低的优先级
    // NoLane
    ensureRootIsScheduled(root);
    return;
  }

  const exitStatus = renderRoot(root, nextLanes, false);

  // exitStatus 是完成状态
  if (exitStatus === RootCompleted) {
    // 生成 wip FiberNode 树
    const finishedWork = root.current.alternate;
    root.finishedWork = finishedWork;
    root.finishedLane = nextLanes;
    wipRootRenderLane = NoLane;

    // wip FiberNode 树中的 flags
    commitRoot(root);
  } else {
    if (__DEV__) {
      console.error("还未实现同步更新结束状态");
    }
  }
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
  if (__DEV__) {
    console.log(`开始${shouldTimeSlice ? "并发" : "同步"}更新`, root);
  }

  // 不需要每次都初始化, 可能是中断 继续的操作
  if (wipRootRenderLane !== lane) {
    // 初始化
    prepareFreshStack(root, lane);
  }

  // do while 是 workLoop 出错，就进入 try catch 重试
  do {
    try {
      // 开始 workLoop 整个更新的流程
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
      break;
    } catch (e) {
      if (__DEV__) {
        console.warn("workLoop 发生错误", e);
      }
      workInProgress = null;
    }
  } while (true);

  // 执行到这里可能是: 中断执行 || render 阶段执行完了
  if (shouldTimeSlice && workInProgress !== null) {
    // 中断
    return RootInComplete;
  }

  if (!shouldTimeSlice && workInProgress !== null) {
    if (__DEV__) {
      console.error("render 阶段结束时 workInProgress 应该为 null");
    }
  }

  // TODO 报错

  return RootCompleted;
}

/**
 * commit 阶段的 3 个阶段
 * 1.beforeMutation
 * 2.mutation
 * 3.layout
 */
function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork!;

  if (finishedWork === null) {
    return;
  }

  const lane = root.finishedLane;

  if (lane === NoLane) {
    if (__DEV__) {
      console.error("commit 阶段不应该是 NoLane");
    }
  }

  if (__DEV__) {
    console.warn("commit 阶段开始", finishedWork);
  }

  // 重置
  root.finishedWork = null;
  root.finishedLane = NoLane;

  // 移除本次 lane
  markRootFinished(root, lane);

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    // 防止执行多次 commitRoot 时执行多次调度
    if (!rootDoesHasPassiveEffect) {
      rootDoesHasPassiveEffect = true;
      // 调度副作用
      scheduleCallback(NormalPriority, () => {
        // 执行副作用
        flushPassiveEffects(root.pendingPassiveEffects);
        return;
      });
    }
  }

  // 判断是否存在 3 个子阶段需要执行的操作
  // root.flags root.subtreeFlags
  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

  if (subtreeHasEffect || rootHasEffect) {
    // 1.beforeMutation
    // 2.mutation: Placement
    commitMutationEffects(finishedWork, root);

    // fiber 树切换
    root.current = finishedWork;

    // 3.layout
    commitLayoutEffects(finishedWork, root);
  } else {
    root.current = finishedWork;
  }

  rootDoesHasPassiveEffect = false;
  ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  let didFlushPassiveEffect = false;
  pendingPassiveEffects.unmount.forEach(effect => {
    didFlushPassiveEffect = true;
    commitHookEffectListDestroy(HookPassive, effect);
  });
  pendingPassiveEffects.unmount = [];

  pendingPassiveEffects.update.forEach(effect => {
    didFlushPassiveEffect = true;
    commitHookEffectListUnmount(HookPassive | HookHasEffect, effect);
  });

  pendingPassiveEffects.update.forEach(effect => {
    didFlushPassiveEffect = true;
    commitHookEffectListMount(HookPassive | HookHasEffect, effect);
  });
  pendingPassiveEffects.update = [];

  // 可能在 useEffect 还会触发更新, 再次调用 flushSyncCallbacks
  flushSyncCallbacks();

  return didFlushPassiveEffect;
}

/** 用于 effect create 执行前触发上一次的 destroy effect */
function commitHookEffectListUnmount(flags: HookFlags, lastEffect: Effect) {
  const firstEffect = lastEffect.next;
  let effect = firstEffect!;

  do {
    if ((effect.tag & flags) === flags) {
      const destroy = effect.destroy;
      if (isFunction(destroy)) {
        destroy();
      }
    }
    effect = effect.next!;
  } while (effect !== firstEffect);
}

/** 用于组件解绑前触发 destroy effect */
function commitHookEffectListDestroy(flags: HookFlags, lastEffect: Effect) {
  const firstEffect = lastEffect.next;
  let effect = firstEffect!;

  do {
    if ((effect.tag & flags) === flags) {
      const destroy = effect.destroy;
      if (isFunction(destroy)) {
        destroy();
      }
      // 组件卸载了, 保证后续不会在触发 create
      effect.tag &= ~HookHasEffect;
    }
    effect = effect.next!;
  } while (effect !== firstEffect);
}

/** 用于执行 effect create */
function commitHookEffectListMount(flags: HookFlags, lastEffect: Effect) {
  const firstEffect = lastEffect.next;
  let effect = firstEffect!;

  do {
    if ((effect.tag & flags) === flags) {
      const create = effect.create;
      effect.destroy = create() ?? null;
    }
    effect = effect.next!;
  } while (effect !== firstEffect);
}

// 更新流程的目的:
// 生成 wip fiberBode 的树
// 标记副作用 flags

// 更新流程的步骤:
// 递: beginWork
// 归: completeWork

function workLoopSync() {
  while (workInProgress !== null) {
    preformUnitOfWork(workInProgress);
  }
}

function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    preformUnitOfWork(workInProgress);
  }
}

function preformUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, wipRootRenderLane);
  fiber.memoizedProps = fiber.pendingProps;

  if (next === null) {
    // completeWork();
    completeUnitOfWork(fiber);
  } else {
    workInProgress = next;
  }
}

// 如果有子节点，遍历子节点
// 如果没有子节点，遍历兄弟节点
function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber;

  do {
    completeWork(node);
    const sibling = node.sibling;
    if (sibling !== null) {
      workInProgress = sibling;
      return;
    }

    node = node.return;
    workInProgress = node;
  } while (node !== null);
}
