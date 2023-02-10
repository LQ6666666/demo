type IteratorFnType<T, R> = (item: T, index: number, array: T[]) => Promise<R>;
/**
 * @param poolLimit 限制的并发数
 * @param array 表示任务数组
 * @param iteratorFn 表示迭代函数，用于实现对每个任务项进行处理
 * @returns 该函数会返回一个 Promise 对象或异步函数
 */
async function asyncPool<T, R>(
  poolLimit = 2,
  array: T[],
  iteratorFn: IteratorFnType<T, R>
): Promise<R[]> {
  const n = array.length;
  // 存储所有的异步任务
  const ret: Promise<R>[] = [];
  // 存储正在执行的异步任务
  const executing: Promise<void>[] = [];

  for (let i = 0; i < n; i++) {
    // 调用 iteratorFn 函数创建异步任务
    const p = Promise.resolve().then(() => iteratorFn(array[i], i, array));
    ret.push(p);

    // 当 poolLimit 值小于或等于总任务个数时，进行并发控制
    if (poolLimit <= n) {
      const e = p.then(() => {
        // 当任务完成后，从正在执行的任务数组中移除已完成的任务
        executing.splice(executing.indexOf(e), 1);
      });
      executing.push(e);

      if (executing.length >= poolLimit) {
        // 等待较快的任务执行完成
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(ret);
}

export { asyncPool };
