// 不同的宿主环境有不同的实现
// import { ContainerInfo } from "./hostConfig";
import { Container } from "hostConfig";
import { FiberNode } from "./fiber";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLane";
import { Effect } from "./fiberHooks";
import { type CallbackNode } from "scheduler";

export interface PendingPassiveEffects {
  unmount: Effect[];
  update: Effect[];
}

export class FiberRootNode {
  public current: FiberNode;
  public pendingLanes: Lanes;
  public finishedLane: Lane;
  public pendingPassiveEffects: PendingPassiveEffects;

  public callbackNode: CallbackNode | null;
  public callbackPriority: Lane;

  constructor(
    public containerInfo: Container,
    hostRootFiber: FiberNode,
    public finishedWork?: FiberNode | null
  ) {
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
    this.finishedWork = null;
    this.pendingLanes = NoLanes;
    this.finishedLane = NoLane;

    this.callbackNode = null;
    this.callbackPriority = NoLane;

    // 收集两种回调
    this.pendingPassiveEffects = {
      unmount: [],
      update: []
    };
  }
}
