import { FiberRootNode } from "./fiberRoot";
import {
  unstable_getCurrentPriorityLevel,
  unstable_ImmediatePriority,
  unstable_UserBlockingPriority,
  unstable_NormalPriority,
  unstable_IdlePriority
} from "scheduler";
import { internals } from "@react/shared";

const { currentBatchConfig } = internals;

export type Lane = number;
export type Lanes = number;

export const NoLane: Lane = 0b0000000000000000000000000000000;
export const NoLanes: Lanes = 0b0000000000000000000000000000000;

export const SyncLane: Lane = 0b0000000000000000000000000000010;

/** 连续输入 */
export const InputContinuousLane: Lane = 0b0000000000000000000000000001000;

/** 默认 */
export const DefaultLane: Lane = 0b0000000000000000000000000100000;

export const TransitionLane: Lane = 0b0000000000000000000000010000000;

/** 空闲 */
export const IdleLane: Lane = 0b0100000000000000000000000000000;

export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b;
}

export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
  return set & ~subset;
}

// 运行流程在 React 时, 使用的时 Lane 模型
// 运行流程在 Scheduler 时 使用的是优先级

/** 根据触发的更新操作, 返回不同的优先级 */
export function requestUpdateLane() {
  const isTransition = currentBatchConfig.transition;
  if (isTransition) {
    return TransitionLane;
  }

  // 从上下文环境中获取 scheduler 优先级
  const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
  // scheduler 优先级 转成 Lane
  const lane = schedulerPriorityToLane(currentSchedulerPriority);
  return lane;
}

/** 获取优先级最高的 lane */
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

/** 判断一个 Lane 是否在 Lanes 中 */
export function isSubsetOfLanes(set: Lanes, subset: Lane) {
  return (set & subset) === subset;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = removeLanes(root.pendingLanes, lane);
}

/** Lane 转 Scheduler */
export function lanesToSchedulerPriority(lanes: Lanes) {
  const lane = getHighestPriorityLane(lanes);

  if (lane === SyncLane) {
    return unstable_ImmediatePriority;
  }

  if (lane === InputContinuousLane) {
    return unstable_UserBlockingPriority;
  }

  if (lane === DefaultLane) {
    return unstable_NormalPriority;
  }

  return unstable_IdlePriority;
}

/** Scheduler 转 Lane */
export function schedulerPriorityToLane(schedulerPriority: number) {
  if (schedulerPriority === unstable_ImmediatePriority) {
    return SyncLane;
  }

  if (schedulerPriority === unstable_UserBlockingPriority) {
    return InputContinuousLane;
  }

  if (schedulerPriority === unstable_NormalPriority) {
    return DefaultLane;
  }

  return NoLane;
}
