export function callWithErrorHandling(
    fn: Function,
    args?: unknown[],
) {
    let res;
    try {
        res = args ? fn(...args) : fn();
    } catch (error) {
        console.error(error);
    }
    return res;
}