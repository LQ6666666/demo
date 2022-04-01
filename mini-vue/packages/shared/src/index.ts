export const NOOP = () => { };

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

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
    val: object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChanged = (value: any, oldValue: any) => !Object.is(value, oldValue);

const onRE = /^on[^a-z]/;
export const isOn = (key: string): boolean => onRE.test(key);






export * from "./shapeFlags";