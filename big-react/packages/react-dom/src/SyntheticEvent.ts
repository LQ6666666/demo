import {
  unstable_ImmediatePriority,
  unstable_UserBlockingPriority,
  unstable_NormalPriority,
  unstable_runWithPriority
} from "scheduler";

import { Props } from "@react/shared";
import { Container } from "hostConfig";

export const elementPropsKey = "__props";
const validEventTypeList = ["click"];

type EventCallback = (e: Event) => void;

interface Paths {
  capture: EventCallback[];
  bubble: EventCallback[];
}

export interface DOMElement extends Element {
  [elementPropsKey]: Props;
}

interface SyntheticEvent extends Event {
  __stopPropagation: boolean;
}

export function updateFiberProps(node: DOMElement, props: any) {
  node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
  if (!validEventTypeList.includes(eventType)) {
    console.warn(`当前不支持${eventType}事件`);
  }
  if (__DEV__) {
    console.log("初始化事件：", eventType);
  }
  // react 18 是分别订阅 capture 和 bubble
  container.addEventListener(eventType, e => {
    dispatchEvent(container, eventType, e);
  });
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
  const targetElement = e.target as DOMElement | null;
  if (targetElement === null) {
    console.warn("事件不存在 target", e);
    return;
  }
  // 1.收集沿途的事件
  const { capture, bubble } = collectPaths(targetElement, container, eventType);
  // 2.构造合成事件
  const se = createSyntheticEvent(e);
  // 3.遍历 capture
  triggerEventFlow(capture, se);

  if (se.__stopPropagation) {
    // 4.遍历 bubble
    triggerEventFlow(bubble, se);
  }
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
  for (let i = 0; i < paths.length; i++) {
    const callback = paths[i];
    // 改变 callback 执行上下文的优先级
    unstable_runWithPriority(eventTypeToSchedulerPriority(se.type), () => {
      callback.call(null, se);
    });
    if (se.__stopPropagation) {
      // 模拟 stopPropagation
      break;
    }
  }
}

function createSyntheticEvent(e: Event) {
  const syntheticEvent = e as SyntheticEvent;
  syntheticEvent.__stopPropagation = false;
  const originStopPropagation = e.stopPropagation;

  syntheticEvent.stopPropagation = () => {
    syntheticEvent.__stopPropagation = true;
    originStopPropagation?.();
  };

  return syntheticEvent;
}

function collectPaths(targetElement: DOMElement, container: Container, eventType: string) {
  const paths: Paths = {
    capture: [],
    bubble: []
  };

  while (targetElement && targetElement !== container) {
    const elementProps = targetElement[elementPropsKey];
    if (elementProps) {
      // click => onClick onClickCapture
      const callbackNameList = getEventCallbackNameFromEventType(eventType);
      if (callbackNameList) {
        callbackNameList.forEach((callbackName, i) => {
          const eventCallback = elementProps[callbackName];
          if (eventCallback) {
            if (i === 0) {
              // capture
              paths.capture.unshift(eventCallback);
            } else {
              // bubble
              paths.capture.push(eventCallback);
            }
          }
        });
      }
    }
    targetElement = targetElement.parentNode as DOMElement;
  }

  return paths;
}

function getEventCallbackNameFromEventType(eventType: string) {
  return (
    {
      click: ["onClickCapture", "onClick"]
    }[eventType] ?? null
  );
}

function eventTypeToSchedulerPriority(eventType: string) {
  switch (eventType) {
    case "click":
    case "keydown":
    case "keyup":
      return unstable_ImmediatePriority;
    case "scroll":
      return unstable_UserBlockingPriority;
    default:
      return unstable_NormalPriority;
  }
}
