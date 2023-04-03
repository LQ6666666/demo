export function forEachValue<T extends object, K extends keyof T>(
  obj: T,
  fn: (val: T[K], key: K) => void
) {
  Object.keys(obj).forEach(key => fn(obj[key as K], key as K));
}

export const isPromise = (val: unknown): val is Promise<any> =>
  !!(val && typeof (val as any)?.then === "function");
