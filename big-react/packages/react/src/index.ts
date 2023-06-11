import currentDispatcher, {
  Dispatcher,
  resolveDispatcher,
  type Dispatch
} from "./currentDispatcher";
import currentBatchConfig from "./currentBatchConfig";
import { jsx, createElement, isValidElement } from "./jsx";

export const useState: Dispatcher["useState"] = initialState => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
};

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
};

export const useTransition: Dispatcher["useTransition"] = () => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
};

export const useRef: Dispatcher["useRef"] = initialValue => {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
};

export type { Dispatcher, Dispatch };
export { createElement, jsx, isValidElement };

export const version = "0.0.0";

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
  currentBatchConfig
};
