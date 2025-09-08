import {SearchRequestSchema, SearchResponseSchema} from "./schema.js";

/** Normalized error for all failures (HTTP, validation, network, parse). */
export class APIError extends Error {
    /**
     * @param {string} message
     * @param {{ status?: number, code?: string, details?: unknown, response?: unknown }} [meta]
     */
    constructor(message, {status, code, details, response} = {}) {
        super(message);
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
    /**
     * @param {object} opts
     * @param {string} opts.apiKey - Your SearchMCP API key (sent as `x-api-key`)
     * @param {string} [opts.baseURL="https://api.searchmcp.io"] - API base URL
     * @param {number} [opts.timeout=10000] - Request timeout in milliseconds
     * @param {number} [opts.maxRetries=2] - Retries on 429 / 5xx
     * @param {string} [opts.userAgentExtra] - Appends to User-Agent (e.g. "my-app/1.0.0")
     */
    constructor({apiKey, baseURL = "https://api.searchmcp.io", timeout = 10_000, maxRetries = 2, userAgentExtra} = {}) {
        if (!apiKey) throw new Error("apiKey is required");
        this.apiKey = apiKey;
        this.baseURL = baseURL.replace(/\/+$/, "");
        this.timeout = timeout;
        this.maxRetries = Math.max(0, maxRetries);
        this.userAgentExtra = userAgentExtra;
    }

    /**
     * Perform a search.
     *
     * @param {string} query - Search query (1–1024 chars)
     * @param {import("./schema.js").Location | keyof import("./schema.js").Location | undefined} [location] - Either enum key (e.g. "USA") or value (e.g. "United States")
     * @param {import("./schema.js").CountryCode | keyof import("./schema.js").CountryCode | undefined} [country] - ISO-3166-1 alpha-2 (e.g. "US", "GB")
     * @param {number} [numberOfResults=10] - Integer 1–100 (defaults to 10)
     * @param {import("./schema.js").DateRange | keyof import("./schema.js").DateRange | undefined} [dateRange] - Time filter (e.g. "PAST_WEEK")
     * @param {{ signal?: AbortSignal }} [options] - Optional abort signal
     * @returns {Promise<import("zod").z.infer<typeof SearchResponseSchema>>}
     */
    async search(
        query,
        location = undefined,
        country = undefined,
        numberOfResults = 10,
        dateRange = undefined,
        options = {},
    ) {

        const candidate = {
            query,
            ...(location !== undefined ? {location} : {}),
            ...(country !== undefined ? {country} : {}),
            ...(numberOfResults !== undefined ? {numberOfResults} : {}),
            ...(dateRange !== undefined ? {dateRange} : {}),
        };

        const parsed = SearchRequestSchema.safeParse(candidate);
        if (!parsed.success) {
            throw new APIError("Invalid SearchRequest", {
                status: 400,
                details: parsed.error.flatten(),
            });
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
                        this.userAgentExtra ? {"user-agent": `@searchmcp/client ${this.userAgentExtra}`} : undefined,
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
                    throw new APIError(`HTTP ${res.status}`, {
                        status: res.status,
                        response: json,
                    });
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
                const apiErr = err instanceof APIError
                    ? err
                    : new APIError(err?.message || "Network/Unknown error", {
                        status: err?.status,
                        response: err?.response
                    });

                const status = apiErr.status;
                const retryable = status === 429 || (status >= 500 && status <= 599);
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
}

/** Convenience factory */
export function createSearchMCPClient(opts) {
    return new SearchMCPClient(opts);
}
