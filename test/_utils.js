import {vi} from "vitest";

export function mkRes(status, body, headers = {}) {
    const text = typeof body === "string" ? body : JSON.stringify(body ?? {});
    return {
        ok: status >= 200 && status < 300,
        status,
        headers,
        async text() {
            return text;
        },
    };
}

export function makeHangingFetch() {
    return vi.fn(async (_url, init = {}) => {
        return new Promise((_, reject) => {
            const sig = init.signal;
            if (sig) {
                if (sig.aborted) {
                    reject(Object.assign(new Error("AbortError"), {name: "AbortError"}));
                    return;
                }
                const onAbort = () => {
                    reject(Object.assign(new Error("AbortError"), {name: "AbortError"}));
                    sig.removeEventListener("abort", onAbort);
                };
                sig.addEventListener("abort", onAbort, {once: true});
            }
        });
    });
}

export function makeQueuedFetch(queue = []) {
    let last = queue.length ? queue[queue.length - 1] : mkRes(500, {error: "exhausted"});
    const fn = vi.fn(async (url, init) => {
        if (queue.length === 0) {
            return typeof last === "function" ? last(url, init) : last;
        }
        const next = queue.shift();
        last = next;
        return typeof next === "function" ? next(url, init) : next;
    });
    fn.__queue = queue;
    return fn;
}
