import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError, createSearchMCPClient, SearchMCPClient } from "../src/index.js";
import {
    CountryCode,
    DateRange,
    Location,
    SearchRequestSchema,
    SearchResponseSchema,
} from "../src/schema.js";
import { makeHangingFetch, makeQueuedFetch, mkRes } from "./_utils.js";

const API_BASE = "https://api.searchmcp.io";
const API_KEY = "sk-test-123";

describe("SearchMCPClient", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("exports schemas and types (smoke)", () => {
        expect(SearchRequestSchema).toBeDefined();
        expect(SearchResponseSchema).toBeDefined();
        expect(Location.USA || Location["USA"]).toBeDefined();
        expect(DateRange.PAST_WEEK).toBe("PAST_WEEK");
        expect(CountryCode.US).toBe("US");
    });

    it("creates via factory and trims baseURL trailing slashes", () => {
        const c = createSearchMCPClient({ apiKey: API_KEY, baseURL: "https://api.searchmcp.io///" });
        expect(c.baseURL).toBe(API_BASE);
    });

    it("sends correct headers including user-agent extra", async () => {
        const fetchMock = makeQueuedFetch([mkRes(200, { status: "SUCCESS" })]);
        globalThis.fetch = fetchMock;

        const client = new SearchMCPClient({
            apiKey: API_KEY,
            baseURL: API_BASE,
            userAgentExtra: "my-app/1.2.3",
        });

        await client.search({ query: "hello world" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0];
        expect(init.method).toBe("POST");
        expect(init.headers["x-api-key"]).toBe(API_KEY);
        expect(init.headers["content-type"]).toBe("application/json");
        expect(init.headers["user-agent"]).toMatch(/@searchmcp\/client my-app\/1\.2\.3/);
    });

    it("defaults numberOfResults to 10 and trims query", async () => {
        let capturedBody;
        const fetchMock = vi.fn(async (_url, init) => {
            capturedBody = JSON.parse(init.body);
            return mkRes(200, { status: "SUCCESS", credits: 99 });
        });
        globalThis.fetch = fetchMock;

        const client = new SearchMCPClient({ apiKey: API_KEY, baseURL: API_BASE });
        const res = await client.search({ query: "   gpu deals   " });

        expect(capturedBody.query).toBe("gpu deals");
        expect(capturedBody.numberOfResults).toBe(10);
        expect(res.status).toBe("SUCCESS");
        expect(res.credits).toBe(99);
    });

    it("accepts location as enum key OR value", async () => {
        const fetchMock = vi.fn(async (_url, init) => {
            const body = JSON.parse(init.body);
            expect(body.location).toBe(Location.USA);
            return mkRes(200, { status: "SUCCESS" });
        });
        globalThis.fetch = fetchMock;

        const client = new SearchMCPClient({ apiKey: API_KEY });
        await client.search({ query: "q", location: "USA" });

        globalThis.fetch = vi.fn(async (_url, init) => {
            const body = JSON.parse(init.body);
            expect(body.location).toBe(Location.USA);
            return mkRes(200, { status: "SUCCESS" });
        });
        await client.search({ query: "q", location: Location.USA });
    });

    it("validates input and throws APIError on bad request (client-side)", async () => {
        globalThis.fetch = vi.fn();
        const client = new SearchMCPClient({ apiKey: API_KEY });

        await expect(client.search({ query: "" })).rejects.toMatchObject({
            name: "APIError",
            status: 400,
        });

        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("throws APIError for non-OK HTTP with normalized response", async () => {
        globalThis.fetch = makeQueuedFetch([mkRes(401, { error: "Missing x-api-key" })]);
        const client = new SearchMCPClient({ apiKey: "bad-key" });
        await expect(client.search({ query: "test" })).rejects.toMatchObject({ name: "APIError", status: 401 });
    });

    it("retries on 429 then succeeds (exponential backoff)", async () => {
        vi.useFakeTimers();
        try {
            const fetchMock = makeQueuedFetch([
                mkRes(429, { error: "rate limited" }),
                mkRes(200, { status: "SUCCESS", credits: 5 }),
            ]);
            globalThis.fetch = fetchMock;

            const client = new SearchMCPClient({ apiKey: API_KEY, maxRetries: 2 });
            const p = client.search({ query: "rate limit pls" });

            await vi.advanceTimersByTimeAsync(1000);

            const res = await p;
            expect(res.status).toBe("SUCCESS");
            expect(fetchMock).toHaveBeenCalledTimes(2);

            await Promise.resolve();
            await vi.runAllTimersAsync();
            vi.clearAllTimers();
        } finally {
            vi.useRealTimers();
        }
    });

    it("retries on 5xx up to maxRetries then throws", async () => {
        vi.useFakeTimers();
        try {
            globalThis.fetch = makeQueuedFetch([
                mkRes(500, { error: "boom" }),
                mkRes(503, { error: "still boom" }),
                mkRes(500, { error: "final boom" }),
            ]);

            const client = new SearchMCPClient({ apiKey: "k", maxRetries: 2 });
            const p = client.search({ query: "unstable" });
            p.catch(() => {});
            await vi.advanceTimersByTimeAsync(3000);

            await expect(p).rejects.toMatchObject({ name: "APIError", status: 500 });

            expect(globalThis.fetch).toHaveBeenCalledTimes(3);

            await Promise.resolve();
            await vi.runAllTimersAsync();
            vi.clearAllTimers();
        } finally {
            vi.useRealTimers();
        }
    });

    it("handles malformed JSON body (200 OK) and throws Invalid SearchResponse", async () => {
        globalThis.fetch = vi.fn(async () => mkRes(200, "OK-not-json"));
        const client = new SearchMCPClient({ apiKey: API_KEY });
        await expect(client.search({ query: "hello" })).rejects.toMatchObject({
            name: "APIError",
            message: "Invalid SearchResponse from server",
            status: 200,
        });
    });

    it("times out requests and surfaces APIError", async () => {
        vi.useFakeTimers();
        try {
            const hanging = makeHangingFetch();
            globalThis.fetch = hanging;

            const client = new SearchMCPClient({ apiKey: "k", timeout: 50 });
            const p = client.search({ query: "timeout me" });
            p.catch(() => {});

            await vi.advanceTimersByTimeAsync(60);

            await expect(p).rejects.toMatchObject({ name: "APIError" });

            await Promise.resolve();
            await vi.runAllTimersAsync();
            vi.clearAllTimers();
        } finally {
            vi.useRealTimers();
        }
    });

    it("supports caller AbortSignal", async () => {
        const hanging = makeHangingFetch();
        globalThis.fetch = hanging;

        const client = new SearchMCPClient({ apiKey: API_KEY, timeout: 10_000 });

        const controller = new AbortController();
        const p = client.search({ query: "abort me" }, { signal: controller.signal });
        controller.abort();

        await expect(p).rejects.toMatchObject({ name: "APIError" });
        expect(hanging).toHaveBeenCalledTimes(1);
    });

    it("sends full body with provided optional params", async () => {
        let sent;
        globalThis.fetch = vi.fn(async (_url, init) => {
            sent = JSON.parse(init.body);
            return mkRes(200, { status: "SUCCESS" });
        });

        const client = new SearchMCPClient({ apiKey: API_KEY });
        await client.search({
            query: "gaming laptop deals",
            location: "USA",
            country: "US",
            numberOfResults: 25,
            dateRange: "PAST_MONTH",
        });

        expect(sent).toMatchObject({
            query: "gaming laptop deals",
            location: Location.USA,
            country: "US",
            numberOfResults: 25,
            dateRange: "PAST_MONTH",
        });
    });

    it("normalizes unknown thrown errors into APIError", async () => {
        globalThis.fetch = vi.fn(async () => {
            throw new Error("weird low-level error");
        });

        const client = new SearchMCPClient({ apiKey: API_KEY });

        await expect(client.search({ query: "boom" })).rejects.toBeInstanceOf(APIError);
        await expect(client.search({ query: "boom" }).catch((e) => e.message)).resolves.toMatch(
            /weird low-level error|Network\/Unknown error/
        );
    });

    it("throws APIError when server returns 402 (insufficient credits)", async () => {
        globalThis.fetch = vi.fn(async () => mkRes(402, { status: "INSUFFICIENT_CREDITS" }));
        const client = new SearchMCPClient({ apiKey: API_KEY });
        await expect(client.search({ query: "credits" })).rejects.toMatchObject({ name: "APIError", status: 402 });
    });

    it("works for minimal valid server response shape", async () => {
        globalThis.fetch = vi.fn(async () => mkRes(200, { status: "SUCCESS" }));
        const client = new SearchMCPClient({ apiKey: API_KEY });
        const out = await client.search({ query: "ok" });
        expect(out.status).toBe("SUCCESS");
    });
});
