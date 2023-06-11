import { Container } from "hostConfig";
import { FiberNode } from "./fiber";
import { HostRoot } from "./workTags";
import { FiberRootNode } from "./fiberRoot";
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from "./updateQueue";
import { ReactElementType } from "@react/shared";
import { schedulerUpdateQueueOnFiber } from "./workLoop";
import { requestUpdateLane } from "./fiberLane";
import { unstable_runWithPriority, unstable_ImmediatePriority } from "scheduler";

// createRoot 里面调用这个方法
export function createContainer(containerInfo: Container) {
  // 创建整个应用的根节点
  const hostRootFiber = new FiberNode(HostRoot, {}, null);
  // 和 FiberRootNode 连接起来
  const root = new FiberRootNode(containerInfo, hostRootFiber);
  hostRootFiber.updateQueue = createUpdateQueue();
  return root;
}

// 调用 createRoot(root).render(<App/>) 的时候调用这个方法
// <App/> 就是这个 element
export function updateContainer(element: ReactElementType | null, root: FiberRootNode) {
  // 默认启用同步更新
  unstable_runWithPriority(unstable_ImmediatePriority, () => {
    const hostRootFiber = root.current;
    // 创建 update
    const lane = requestUpdateLane();
    const update = createUpdate<ReactElementType | null>(element, lane);
    // 加入 updateQueue
    enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>, update);
    // 首屏渲染 和 触发更新 连接起来
    // 开始调度
    schedulerUpdateQueueOnFiber(hostRootFiber, lane);
  });

  return element;
}
