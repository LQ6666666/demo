import { Key, Props, REACT_FRAGMENT_TYPE, ReactElementType, Ref, isFunction } from "@react/shared";
import { Fragment, FunctionComponent, HostComponent, HostText, WorkTag } from "./workTags";
import { Flags, NoFlags } from "./fiberFlags";

export class FiberNode {
  public type: any;
  public stateNode: any;
  public ref: Ref;
  public key: Key;

  public return: FiberNode | null;
  public sibling: FiberNode | null;
  public child: FiberNode | null;
  public index: number;

  public memoizedProps: Props | null;
  public memoizedState: any;
  public alternate: FiberNode | null;
  public flags: Flags;
  public subtreeFlags: Flags;
  public updateQueue: unknown;
  public deletions: FiberNode[] | null;

  constructor(
    // 实例
    public tag: WorkTag,
    public pendingProps: Props,
    key: Key
  ) {
    // HostComponent: 真实的 DOM
    this.stateNode = null;
    // FunctionComponent () => {};
    this.type = null;
    this.key = key ?? null;

    // 构成树状结构
    // 指向父 fiberNode
    this.return = null;
    // 指向兄弟 fiberNode
    this.sibling = null;
    // 指向子 fiberNode
    this.child = null;
    this.index = 0;

    this.ref = null;

    // 作为工作单元
    // this.pendingProps
    this.memoizedProps = null;
    this.memoizedState = null;
    this.updateQueue = null;

    this.alternate = null;
    // 副作用
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;
  }
}

export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
  let wip = current.alternate;

  // 首屏渲染 wip 就是 null
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key);
    wip.stateNode = current.stateNode;

    wip.alternate = current;
    current.alternate = wip;
  } else {
    // update
    wip.pendingProps = pendingProps;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    wip.deletions = null;
  }

  wip.type = current.type;
  wip.ref = current.ref;
  wip.updateQueue = current.updateQueue;
  wip.child = current.child;
  wip.memoizedProps = current.memoizedProps;
  wip.memoizedState = current.memoizedState;

  return wip;
};

export function createFiberFromElement(element: ReactElementType): FiberNode {
  const { key, props, type, ref } = element;

  // let fiberTag = IndeterminateComponent;
  let fiberTag: WorkTag = FunctionComponent;

  if (isFunction(type)) {
    fiberTag = FunctionComponent;
  } else if (typeof type === "string") {
    fiberTag = HostComponent;
  } else {
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(props.children, key);
    }

    if (__DEV__) {
      console.warn("未定义的 type 类型");
    }
  }

  const fiber = new FiberNode(fiberTag, props, key);
  fiber.type = type;
  fiber.ref = ref;
  return fiber;
}

export function createFiberFromText(textContent: string) {
  const fiber = new FiberNode(HostText, { textContent }, null);
  return fiber;
}

export function createFiberFromFragment(elements: ReactElementType[], key: Key) {
  const fiber = new FiberNode(Fragment, elements, key);
  return fiber;
}
