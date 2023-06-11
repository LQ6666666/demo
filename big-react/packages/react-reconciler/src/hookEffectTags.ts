export type HookFlags = number;

export const NoFlags = 0b0000;

/** 当前 effect 本次更新存在副作用(就是 useEffect 的回调是否执行) */
export const HasEffect = 0b0001;

/** useLayoutEffect */
export const Layout = 0b0100;

/** useEffect 对应的 effect.tag */
export const Passive = 0b1000;
