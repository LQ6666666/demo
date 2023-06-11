import type { Action } from "@react/shared";

export type Dispatch<State> = (action: Action<State>) => void;

export interface Dispatcher {
  useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
  useEffect: (create: () => (() => void) | void, deps?: any[]) => void;
  useTransition: () => [boolean, (callback: () => void) => void];
  useRef: <T>(initialValue: T) => { current: T };
}

// const [count, setCount] = useState(0);

const currentDispatcher: { current: Dispatcher | null } = {
  current: null
};

export const resolveDispatcher = () => {
  const dispatcher = currentDispatcher.current;
  if (dispatcher === null) {
    throw new Error("hooks 只能在函数组件中执行");
  }
  return dispatcher;
};

export default currentDispatcher;
