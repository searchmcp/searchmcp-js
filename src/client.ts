import {SearchRequest, SearchRequestSchema, SearchResponse, SearchResponseSchema} from "./schema.js";

export class APIError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
    response?: unknown;

    constructor(
        message: string,
        {status, code, details, response}: {
            status?: number;
            code?: string;
            details?: unknown;
            response?: unknown
        } = {}
    ) {
        super(message);
        this.name = "APIError";
        this.status = status;
        this.code = code;
        this.details = details;
        this.response = response;
    }
}

function buildHeaders(apiKey: string, extra?: Record<string, string>) {
    return {
        "content-type": "application/json",
        "x-api-key": apiKey,
        ...(extra || {}),
    };
}

function withTimeout(ms: number, upstreamSignal?: AbortSignal) {
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
    private readonly apiKey: string;
    private readonly baseURL: string;
    private readonly timeout: number;
    private readonly maxRetries: number;
    private readonly userAgentExtra?: string;

    constructor({
                    apiKey,
                    baseURL = "https://api.searchmcp.io",
                    timeout = 10_000,
                    maxRetries = 2,
                    userAgentExtra,
                }: {
        apiKey: string;
        baseURL?: string;
        timeout?: number;
        maxRetries?: number;
        userAgentExtra?: string;
    }) {
        if (!apiKey) throw new Error("apiKey is required");
        this.apiKey = apiKey;
        this.baseURL = baseURL.replace(/\/+$/, "");
        this.timeout = timeout;
        this.maxRetries = Math.max(0, maxRetries);
        this.userAgentExtra = userAgentExtra;
    }

    /**
     * @param {SearchRequest} params - Search input matching the schema
     * @param {{ signal?: AbortSignal }} [options] - Optional abort signal
     * @returns {Promise<SearchResponse>}
     */
    async search(params: SearchRequest, options: { signal?: AbortSignal } = {}): Promise<SearchResponse> {
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
                let json: unknown;
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
            } catch (err: any) {
                const apiErr =
                    err instanceof APIError
                        ? err
                        : new APIError(err?.message || "Network/Unknown error", {
                            status: err?.status,
                            response: err?.response,
                        });

                const s = apiErr.status;
                const retryable = s === 429 || (s !== undefined && s >= 500 && s <= 599);
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

    static inputSchema = SearchRequestSchema;
    static outputSchema = SearchResponseSchema;
}

export function createSearchMCPClient(opts: ConstructorParameters<typeof SearchMCPClient>[0]) {
    return new SearchMCPClient(opts);
}
