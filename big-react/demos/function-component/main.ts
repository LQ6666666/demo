import "./style.css";
import {
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_LowPriority as LowPriority,
  unstable_IdlePriority as IdlePriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  CallbackNode,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  unstable_cancelCallback as cancelCallback
} from "scheduler";

type Priority =
  | typeof ImmediatePriority
  | typeof UserBlockingPriority
  | typeof NormalPriority
  | typeof LowPriority
  | typeof IdlePriority;

// const btnEl = document.querySelector("button");
const container = document.getElementById("root");

interface Work {
  count: number;
  priority: Priority;
}

const workList: Work[] = [];
let prevPriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;

[ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority].forEach(priority => {
  const btn = document.createElement("button");
  container?.appendChild(btn);
  btn.innerText = [
    "",
    "ImmediatePriority",
    "UserBlockingPriority",
    "NormalPriority",
    "LowPriority"
  ][priority];

  btn.onclick = () => {
    workList.unshift({
      count: 100,
      priority: priority as Priority
    });

    schedule();
  };
});

function schedule() {
  const cbNode = getFirstCallbackNode();
  // 获取最高优先级的, 就是数值最小的
  const curWork = workList.sort((a, b) => a.priority - b.priority)[0];

  // 策略逻辑
  if (!curWork) {
    curCallback = null;
    cbNode && cancelCallback(cbNode);
    return;
  }

  // 如果优先级相同, 就不需要调度
  const { priority: curPriority } = curWork;
  if (curPriority === prevPriority) {
    return;
  }

  // 更高优先级的 work
  // 取消之前调度的
  cbNode && cancelCallback(cbNode);

  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

// 如果 perform 返回一个函数, 会继续调度返回的函数
function perform(work: Work, didTimeout?: boolean) {
  /**
   * 1. work.priority
   * 2. 饥饿问题
   * 3. 时间切片
   */
  const needSync = work.priority === ImmediatePriority || didTimeout;
  while ((needSync || !shouldYield()) && work.count) {
    work.count--;
    insertSpan(work.priority.toString());
  }

  // 中断执行 || 执行完
  prevPriority = work.priority;
  if (!work.count) {
    const workIndex = workList.indexOf(work);
    workList.splice(workIndex, 1);
    prevPriority = IdlePriority;
  }

  const prevCallback = curCallback;
  schedule();
  const newCallback = curCallback;

  // 如果优先级一样, 上面的 curCallback 就不会赋新的值, 那么这里的 prevCallback 和 newCallback 应该是一样的
  if (newCallback && prevCallback === newCallback) {
    // 还是上一次被调度的 work
    return perform.bind(null, work);
  }
}

function insertSpan(content: string) {
  const span = document.createElement("span");
  span.innerText = content;
  span.className = `pri-${content}`;
  doSomeBusyWork(10000000);
  container?.appendChild(span);
}

function doSomeBusyWork(len: number) {
  let result = 0;
  while (len--) {
    result += len;
  }
  return result;
}
