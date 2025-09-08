// TypeScript declaration file for @searchmcp/client
// Hand-written to avoid TS/Zod tuple quirks.

import type { z } from "zod";

/** ---- Runtime constants (from schema.js) ---- */
export const Location: Readonly<{
    UK: "United Kingdom";
    USA: "United States";
    Mexico: "Mexico";
    Japan: "Japan";
    CALIFORNIA_USA: "California, United States";
    SFO_USA: "San Francisco Bay Area, United States";
    NY_USA: "New York, New York, United States";
    MUMBAI_INDIA: "Mumbai, Maharashtra, India";
    LONDON_UK: "London, England, United Kingdom";
    PARIS_FRANCE: "Paris, Paris, Ile-de-France, France";
    DUBAI: "Dubai International Airport, Dubai, United Arab Emirates";
    BANGKOK: "Bangkok, Bangkok, Thailand";
    SOHO_NYC_USA: "SoHo, New York, United States";
}>;

export type LocationKey = keyof typeof Location;
export type LocationValue = (typeof Location)[LocationKey];

export const DateRange: Readonly<{
    ANYTIME: "ANYTIME";
    PAST_YEAR: "PAST_YEAR";
    PAST_MONTH: "PAST_MONTH";
    PAST_WEEK: "PAST_WEEK";
    PAST_24_HOURS: "PAST_24_HOURS";
    PAST_HOUR: "PAST_HOUR";
}>;
export type DateRangeKey = keyof typeof DateRange;

export const CountryCode: Readonly<Record<string, string>>;
export type CountryCodeKey = keyof typeof CountryCode;

export type SearchStatus =
    | "UNAUTHORIZED"
    | "INSUFFICIENT_CREDITS"
    | "ERROR"
    | "SUCCESS";

/** ---- Schemas (runtime Zod objects re-exported) ---- */
export const SearchRequestSchema: z.ZodTypeAny;
export const SearchResponseSchema: z.ZodTypeAny;

/** ---- Inferred request/response types ---- */
export type SearchRequest = {
    /** 1–1024 chars; trimmed */
    query: string;
    /** enum key ("USA") or enum value ("United States") */
    location?: LocationKey | LocationValue;
    /** ISO-3166-1 alpha-2 code, e.g. "US", "GB" (enum key) */
    country?: CountryCodeKey;
    /** 1–100 (default 10 if omitted) */
    numberOfResults?: number;
    /** date range key like "PAST_WEEK" */
    dateRange?: DateRangeKey;
};

export type SearchParameters = {
    query?: string;
    type?: string;
    engine?: string;
};

export type KnowledgeGraph = {
    title?: string;
    imageUrl?: string;
    description?: string;
    descriptionSource?: string;
    descriptionLink?: string;
    attributes?: Record<string, string>;
};

export type OrganicItem = {
    title: string;
    link: string;
    snippet?: string;
    position?: number;
    date?: string;
};

export type RelatedSearch = { query: string };

export type SearchResponse = {
    status: SearchStatus;
    searchParameters?: SearchParameters;
    knowledgeGraph?: KnowledgeGraph;
    organic?: OrganicItem[];
    relatedSearches?: RelatedSearch[];
    credits?: number;
};

/** ---- Client surface ---- */
export interface SearchMCPClientOptions {
    apiKey: string;
    baseURL?: string;          // default https://api.searchmcp.io
    timeout?: number;          // ms, default 10000
    maxRetries?: number;       // default 2 (on 429/5xx)
    userAgentExtra?: string;   // appended to UA
}

export class APIError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
    response?: unknown;
    constructor(
        message: string,
        meta?: { status?: number; code?: string; details?: unknown; response?: unknown }
    );
}

export class SearchMCPClient {
    apiKey: string;
    baseURL: string;
    timeout: number;
    maxRetries: number;
    userAgentExtra?: string;

    constructor(opts: SearchMCPClientOptions);

    /**
     * Perform a search. Validates input/output against the exported Zod schemas.
     */
    search(params: SearchRequest, options?: { signal?: AbortSignal }): Promise<SearchResponse>;

    /** Convenience accessors for the runtime schemas */
    static inputSchema: typeof SearchRequestSchema;
    static outputSchema: typeof SearchResponseSchema;
}

/** Factory */
export function createSearchMCPClient(opts: SearchMCPClientOptions): SearchMCPClient;

/** Also export the schema-backed types for consumers */
export type { z };
