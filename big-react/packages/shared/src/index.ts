export * from "./ReactSymbols";
export type * from "./ReactTypes";
export { hasOwnProperty } from "./hasOwnProperty";

export { default as internals, type Dispatcher, type Dispatch } from "./internals";

export type AnyFn = (...args: any) => any;

export const isObject = (val: unknown): val is object => typeof val === "object" && val !== null;

export const isFunction = (val: unknown): val is AnyFn => typeof val === "function";

export const isArray = Array.isArray;

export const isString = (val: unknown): val is string => typeof val === "string";

export const isNumber = (val: unknown): val is number => typeof val === "number";

export const objectIs = Object.is;
