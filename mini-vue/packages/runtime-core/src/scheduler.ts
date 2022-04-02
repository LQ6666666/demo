
const queue: any[] = [];
export function queueJob(job: any) {
    if (!queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
let isFlushPending: boolean = false;
function queueFlush() {
    if (!isFlushPending) {
        isFlushPending = true;
        // 加入微任务队列
        window.queueMicrotask(flushJobs);
    }
}

function flushJobs() {
    isFlushPending = false;
    // 清空时，我们需要根据调用的顺序依次刷新，父组件 -> 子组件
    queue.sort((a, b) => getId(a) - getId(b));

    for (let i = 0; i < queue.length; i++) {
        const job = queue[i];
        job();
    }

    queue.length = 0;
}

const getId = (job: any) => job.id == null ? Infinity : job.id;