import { Action, Dispatch, isFunction } from "@react/shared";
import { Lane, NoLane, isSubsetOfLanes } from "./fiberLane";

// this.setState(val);
// this.setState(val => newVal);

export interface Update<State> {
  action: Action<State>;
  lane: Lane;
  next: Update<State> | null;
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null;
  };
  dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
  return {
    action,
    lane,
    next: null
  };
};

export const createUpdateQueue = <State>() => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  } as UpdateQueue<State>;
};

export const enqueueUpdate = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
  // pending 指向 4 (最后的 update, 最后的 update 在指向第一个 update)
  // 1 => 2 => 3 => 4
  // 4.next 指向 1
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }

  updateQueue.shared.pending = update;
};
/**
 * ```ts
 *  // u0
 *  {
 *    action: num => num + 1
 *    lane: DefaultLane
 *  }
 *  // u1
 *  {
 *    action: 3
 *    lane: SyncLane
 *  }
 *  // u2
 *  {
 *    action: num => num + 10
 *    lane: DefaultLane
 *  }
 *  // state = 0; updateLane = DefaultLane
 *  // 只考虑优先级的情况的结果: 11
 *  // 只考虑连续性的情况的结果: 13
 * ```
 * 新增 baseState、baseQueue 字段
 * - baseState 是本次更新参与计算的初始 state, memoizedState 是上次更新计算的最终 state
 * - 如果本次更新没有 update 被跳过, 则下次更新开始时 baseState === memoizedState
 * - 如果本次更新有 update 被跳过, 则本次更新计算出的 memoizedState 为**考虑优先级**情况下计算的结果, baseState 为**最后一个没有被跳过的 update 计算后的结果**, 下次更新开始时 baseState !== memoizedState
 * - 本次更新**被跳过的 update 及其后面的所有 update ** 都会被保存在 baseQueue 中参与下次 state 计算
 * - 本次更新**参与计算但保存在 baseQueue 中的 update **, 优先级会降低到 NoLane(NoLane 会参数下次优先级的计算 isSubsetOfLanes(xxx, NoLane) 一定是满足的)
 */
export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): { memoizedState: State; baseState: State; baseQueue: Update<State> | null } => {
  // lane 的因素
  // update 是一个链表

  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState: baseState,
    baseQueue: null
  };

  if (pendingUpdate !== null) {
    // 第一个 update
    const pending = pendingUpdate.next!;
    let update = pendingUpdate.next!;

    let newBaseState = baseState;
    // 赋值给 memoizedState 的
    let newState = baseState;
    let newBaseQueueFirst: Update<State> | null = null;
    let newBaseQueueLast: Update<State> | null = null;

    do {
      const updateLane = update!.lane;
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // 优先级不够, 跳过
        const clone = createUpdate(update.action, pending.lane);
        // 是不是第一个被跳过
        if (newBaseQueueFirst === null) {
          newBaseQueueFirst = clone;
          newBaseQueueLast = clone;
          // baseState 在这里确定值
          newBaseState = newState;
        } else {
          newBaseQueueLast!.next = clone;
          newBaseQueueLast = clone;
        }
      } else {
        // 优先级足够
        if (newBaseQueueFirst !== null) {
          // 降低到 NoLane
          const clone = createUpdate(update.action, NoLane);
          newBaseQueueLast!.next = clone;
          newBaseQueueLast = clone;
        }

        // baseState 1 update 2 => memoizedState 2
        // baseState 1 update (x) => 4 * x => memoizedState 4
        const action = update!.action;
        // console.log(baseState);
        if (isFunction(action)) {
          newState = action(newState);
        } else {
          newState = action;
        }
      }

      update = update!.next!;
    } while (update !== pending);

    if (newBaseQueueFirst === null) {
      // 本次计算没有 Update 被跳过
      newBaseState = newState;
    } else {
      // 合成一个环状链表
      newBaseQueueLast!.next = newBaseQueueFirst;
    }

    result.memoizedState = newState;
    result.baseState = newBaseState;
    result.baseQueue = newBaseQueueLast;
  }

  return result;
};

/**
 * ```ts
 *  u0 = {
 *    action: num => num + 1
 *    lane: DefaultLane
 *  }
 *  u1 = {
 *    action: 3
 *    lane: SyncLane
 *  }
 *  u2 = {
 *    action: num => num + 10
 *    lane: DefaultLane
 *  }
 * ```
 *
 * 第一次 render
 * baseState = 0; memoizedState = 0;
 * baseQueue = null; updateLane = Default;
 * 第一次 render 第一次计算
 * baseState = 1; memoizedState = 1;
 * baseQueue = null;
 * 第一次 render 第二次计算
 * baseState = 1; memoizedState = 1;
 * baseQueue = u1;
 * 第一次 render 第三次计算
 * baseState = 1; memoizedState = 11;
 * baseQueue = u1 => u2(NoLane);
 *
 * 第二次 render
 * baseState = 1; memoizedState = 11;
 * baseQueue = u1 => u2(NoLane); updateLane = SyncLane;
 * 第二次 render 第一次计算
 * baseState = 3; memoizedState = 3;
 * 第二次 render 第二次计算
 * baseState = 13; memoizedState = 13;
 */
