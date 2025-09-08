import {SearchRequestSchema, SearchResponseSchema} from "./schema.js";

/** Normalized error for all failures (HTTP, validation, network, parse). */
export class APIError extends Error {
    /**
     * @param {string} message
     * @param {{ status?: number, code?: string, details?: unknown, response?: unknown }} [meta]
     */
    constructor(message, meta) {
        super(message);
        const {status, code, details, response} = meta;
        this.name = "APIError";
        this.status = status;
        this.code = code;
        this.details = details;
        this.response = response;
    }
}

function buildHeaders(apiKey, extra) {
    return {
        "content-type": "application/json",
        "x-api-key": apiKey,
        ...(extra || {}),
    };
}

function withTimeout(ms, upstreamSignal) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    if (upstreamSignal) {
        upstreamSignal.addEventListener("abort", () => controller.abort(), {once: true});
    }
    return {
        signal: controller.signal,
        cancel: () => clearTimeout(id),
    };
}

export class SearchMCPClient {
    constructor(opts = {}) {
        const {
            apiKey,
            baseURL = "https://api.searchmcp.io",
            timeout = 10_000,
            maxRetries = 2,
            userAgentExtra,
        } = opts;
        if (!apiKey) throw new Error("apiKey is required");
        this.apiKey = apiKey;
        this.baseURL = baseURL.replace(/\/+$/, "");
        this.timeout = timeout;
        this.maxRetries = Math.max(0, maxRetries);
        this.userAgentExtra = userAgentExtra;
    }

    /**
     * @param {SearchRequestSchema} params
     * @param {{ signal?: AbortSignal }} [options]
     * @returns {Promise<SearchResponseSchema>}
     */
    async search(params, options = {}) {
        const parsed = SearchRequestSchema.safeParse(params);
        if (!parsed.success) {
            throw new APIError("Invalid SearchRequest", {status: 400, details: parsed.error.flatten()});
        }

        const url = `${this.baseURL}/v1/search`;
        const body = JSON.stringify(parsed.data);

        let attempt = 0;
        while (true) {
            const {signal, cancel} = withTimeout(this.timeout, options.signal);
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: buildHeaders(
                        this.apiKey,
                        this.userAgentExtra ? {"user-agent": `@searchmcp/client ${this.userAgentExtra}`} : undefined
                    ),
                    body,
                    signal,
                });

                const text = await res.text();
                let json;
                try {
                    json = text ? JSON.parse(text) : {};
                } catch {
                    json = {raw: text};
                }

                if (!res.ok) {
                    throw new APIError(`HTTP ${res.status}`, {status: res.status, response: json});
                }

                const out = SearchResponseSchema.safeParse(json);
                if (!out.success) {
                    throw new APIError("Invalid SearchResponse from server", {
                        status: res.status,
                        details: out.error.flatten(),
                        response: json,
                    });
                }
                return out.data;
            } catch (err) {
                const apiErr =
                    err instanceof APIError
                        ? err
                        : new APIError(err?.message || "Network/Unknown error", {
                            status: err?.status,
                            response: err?.response,
                        });

                const s = apiErr.status;
                const retryable = s === 429 || (s >= 500 && s <= 599);
                if (retryable && attempt < this.maxRetries) {
                    attempt++;
                    const backoff = Math.min(1000 * 2 ** (attempt - 1), 4000);
                    await new Promise((r) => setTimeout(r, backoff));
                    continue;
                }
                throw apiErr;
            } finally {
                cancel();
            }
        }
    }

    /** Expose schemas alongside the class for convenience */
    static inputSchema = SearchRequestSchema;
    static outputSchema = SearchResponseSchema;
}

/** Convenience factory */
export function createSearchMCPClient(opts) {
    return new SearchMCPClient(opts);
}
