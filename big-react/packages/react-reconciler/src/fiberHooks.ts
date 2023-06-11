import { FiberNode } from "./fiber";
import { Passive as PassiveEffect } from "./fiberFlags";
import { Lane, NoLane, requestUpdateLane } from "./fiberLane";
import { HookFlags, Passive as HookPassive, HasEffect as HookHasEffect } from "./hookEffectTags";
import { Update, processUpdateQueue } from "./updateQueue";
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from "./updateQueue";
import { schedulerUpdateQueueOnFiber } from "./workLoop";
import { internals, type Dispatcher, Dispatch, isFunction, Action, objectIs } from "@react/shared";

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher, currentBatchConfig } = internals;

interface Hook {
  memoizedState: any;
  queue: unknown;
  next: Hook | null;
  baseState: any;
  baseQueue: Update<any> | null;
}

type EffectCallback = () => void | EffectDestroy;
type EffectDestroy = () => void;
type EffectDeps = any[];

export interface Effect {
  tag: HookFlags;
  create: EffectCallback;
  destroy: EffectDestroy | null;
  deps: EffectDeps | null;
  next: Effect | null;
}

export interface FunctionComponentUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: Effect | null;
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  // currentlyRenderingFiber 赋值操作
  currentlyRenderingFiber = wip;
  // 重置 hooks 链表
  wip.memoizedState = null;
  // 重置 effect 链表
  wip.updateQueue = null;
  renderLane = lane;

  const current = wip.alternate;
  if (current !== null) {
    // update
    currentDispatcher.current = HookDispatcherOnUpdate;
  } else {
    // mount
    currentDispatcher.current = HookDispatcherOnMount;
  }

  const Component = wip.type;
  const props = wip.pendingProps;
  const children = Component(props);

  // 重置操作
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;
  renderLane = NoLane;

  return children;
}

const HookDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect,
  useTransition: mountTransition,
  useRef: mountRef
};

const HookDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect,
  useTransition: updateTransition,
  useRef: updateRef
};

function mountEffect(create: EffectCallback, deps?: EffectDeps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps ?? null;
  currentlyRenderingFiber!.flags |= PassiveEffect;

  // mount 阶段需要触发回调
  hook.memoizedState = pushEffect(HookPassive | HookHasEffect, create, null, nextDeps);
}

function updateEffect(create: EffectCallback, deps?: EffectDeps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps ?? null;
  let destroy: EffectDestroy | null = null;

  if (currentHook !== null) {
    // 从 currentHook 中获取上一次的 effect
    const prevEffect = currentHook.memoizedState as Effect;
    destroy = prevEffect.destroy;

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 相等
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(HookPassive, create, destroy, nextDeps);
        return;
      }
    }

    // 不相等
    currentlyRenderingFiber!.flags |= PassiveEffect;
    hook.memoizedState = pushEffect(HookPassive | HookHasEffect, create, destroy, nextDeps);
  }
}

function pushEffect(
  tag: HookFlags,
  create: EffectCallback,
  destroy: EffectDestroy | null = null,
  deps: EffectDeps | null = null
) {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
    next: null
  };
  const fiber = currentlyRenderingFiber!;
  let updateQueue = fiber.updateQueue as FunctionComponentUpdateQueue<any> | null;
  if (updateQueue === null) {
    updateQueue = createFunctionComponentUpdateQueue();
    fiber.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    // 插入 effect
    const lastEffect = updateQueue.lastEffect;
    if (lastEffect === null) {
      effect.next = effect;
      updateQueue.lastEffect = effect;
    } else {
      const firstEffect = lastEffect.next;
      effect.next = firstEffect;
      lastEffect.next = effect;
      updateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFunctionComponentUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FunctionComponentUpdateQueue<State>;
  updateQueue.lastEffect = null;
  return updateQueue;
}

function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
  // 找到当前 useState 对于的 hook 的数据
  const hook = mountWorkInProgressHook();

  let memoizedState: State;
  if (isFunction(initialState)) {
    memoizedState = initialState();
  } else {
    memoizedState = initialState;
  }

  hook.memoizedState = memoizedState;
  const queue = createUpdateQueue<State>();
  hook.queue = queue;
  hook.baseState = memoizedState;

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue);
  queue.dispatch = dispatch;

  return [memoizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
  // 找到当前 useState 对于的 hook 的数据
  const hook = updateWorkInProgressHook();

  // 计算新 state 的逻辑
  const queue = hook.queue as UpdateQueue<State>;
  const baseState = hook.baseState;

  const pending = queue.shared.pending;
  const current = currentHook!;
  let baseQueue = current.baseQueue;

  if (pending !== null) {
    // pending baseQueue update 保存在 current 中
    if (baseQueue !== null) {
      // baseQueue b2 => b0 => b1 => b2
      // pendingQueue p2 => p0 => p1 => p2

      // b0
      const baseFirst = baseQueue.next;
      // p0
      const pendingFirst = pending.next;
      // b2 => p0
      baseQueue.next = pendingFirst;
      // p2 => b0
      pending!.next = baseFirst;
      // 合并成环状链表
      // p2 => b0 => b1 => b2 => p0 => p1 => p2
    }
    baseQueue = pending;
    // 保存在 current 中
    current.baseQueue = pending;
    // 更新之后, 清空 updateQueue
    queue.shared.pending = null;
  }

  if (baseQueue !== null) {
    const {
      memoizedState,
      baseState: newBaseState,
      baseQueue: newBaseQueue
    } = processUpdateQueue(baseState, baseQueue, renderLane);

    hook.memoizedState = memoizedState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueue;
  }

  return [hook.memoizedState, queue.dispatch!];
}

function mountTransition(): [boolean, (callback: () => void) => void] {
  const [isPending, setPending] = mountState(false);
  const hook = mountWorkInProgressHook();
  const start = startTransition.bind(null, setPending);
  hook.memoizedState = start;
  return [isPending, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
  const [isPending] = updateState<boolean>();
  const hook = updateWorkInProgressHook();
  const start = hook.memoizedState;
  return [isPending, start];
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
  setPending(true);

  const prevTransition = currentBatchConfig.transition;
  currentBatchConfig.transition = 1;

  callback();
  setPending(false);

  currentBatchConfig.transition = prevTransition;
}

function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

function updateRef() {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

function dispatchSetState<State>(
  fiber: FiberNode,
  queue: UpdateQueue<State>,
  action: Action<State>
) {
  const lane = requestUpdateLane();
  const update = createUpdate(action, lane);
  enqueueUpdate(queue, update);
  schedulerUpdateQueueOnFiber(fiber, lane);
}

function mountWorkInProgressHook() {
  const hook: Hook = {
    memoizedState: null,
    queue: null,
    next: null,
    baseState: null,
    baseQueue: null
  };

  // mount 时候的第一个 hook
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error("请在 FunctionComponent 内调用 Hook");
    } else {
      workInProgressHook = hook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // mount 时后续的 hook
    workInProgressHook.next = hook;
    workInProgressHook = hook;
  }

  return hook;
}

function updateWorkInProgressHook() {
  // TODO render 阶段触发的更新
  let nextCurrentHook: Hook | null = null;

  if (currentHook === null) {
    // 这是 FunctionComponent update 时的第一个 Hook
    const current = currentlyRenderingFiber?.alternate ?? null;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    // FunctionComponent update 时的后续 Hook
    nextCurrentHook = currentHook.next;
  }

  if (nextCurrentHook === null) {
    // mount 和 update 时 hook 的数量不一致
    throw new Error(`组件${currentlyRenderingFiber?.type}本次执行的Hook比上一次数量要多`);
  }

  currentHook = nextCurrentHook;
  const newHook: Hook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
    baseState: currentHook.baseState,
    baseQueue: currentHook.baseQueue
  };

  // update 时候的第一个 hook
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error("请在 FunctionComponent 内调用 Hook");
    } else {
      workInProgressHook = newHook;
      currentlyRenderingFiber.memoizedState = workInProgressHook;
    }
  } else {
    // update 时后续的 hook
    workInProgressHook.next = newHook;
    workInProgressHook = newHook;
  }

  return newHook;
}

function areHookInputsEqual(nextDeps: EffectDeps, prevDeps: EffectDeps | null): boolean {
  if (prevDeps === null) return false;

  for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
    if (objectIs(nextDeps[i], prevDeps[i])) continue;

    return false;
  }

  return true;
}
