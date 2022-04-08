export const NOOP = () => { };
export const EMPTY_OBJ = {};

export const isObject = (val: unknown): val is Record<any, any> => typeof val === "object" && val !== null;

export const extend = Object.assign;

export const isArray = Array.isArray;

export const isFunction = (val: unknown) => typeof val === "function";

export const isNumber = (val: unknown): val is number => typeof val === "number";

export const isString = (val: unknown): val is string => typeof val === "string";

export const isIntegerKey = (key: unknown) => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

export const isMap = (val: unknown): val is Map<any, any> =>
    toTypeString(val) === '[object Map]';

export const isSet = (val: unknown): val is Set<any> =>
    toTypeString(val) === '[object Set]';

/** 是不是普通对象 */
export const isPlainObject = (val: unknown): val is object =>
    toTypeString(val) === '[object Object]'

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
    val: object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue);

const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);

export const invokeArrayFns = (fns: Function[], arg?: any) => {
    for (const fn of fns) {
        fn(arg);
    }
}

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string =>
    objectToString.call(value);

export * from "./shapeFlags";