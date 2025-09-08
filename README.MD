# @searchmcp/client
[![npm (scoped)](https://img.shields.io/npm/v/@searchmcp/client.svg)](https://www.npmjs.com/package/@searchmcp/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Thin JavaScript/Node.js client for the [SearchMCP REST API](https://searchmcp.io).
Provides input/output validation with [zod](https://github.com/colinhacks/zod), retry/backoff handling, and first-class
error reporting.


## Installation

```bash
npm install @searchmcp/client
# or
yarn add @searchmcp/client
# or
pnpm add @searchmcp/client
```

Requires Node.js 18+ (for native `fetch`).

## Usage

```js
import {createSearchMCPClient} from "@searchmcp/client";

const client = createSearchMCPClient({apiKey: process.env.SEARCHMCP_API_KEY});

const res = await client.search("latest GPU deals", "USA", "US", 10, "PAST_WEEK");

console.log(res.status); // "SUCCESS"
console.log(res.organic?.map(r => r.title));
```

### Constructor Options

```ts
type SearchMCPClientOptions = {
    apiKey: string;                   // required
    baseURL?: string;                 // defaults to https://api.searchmcp.io
    timeout?: number;                 // request timeout in ms (default 10000)
    maxRetries?: number;              // retries on 429/5xx (default 2)
    userAgentExtra?: string;          // appended to user-agent header
};
```

### `search` Method

```ts
async
search(
    query
:
string,
    location ? : Location,              // Location enum key or value
    country ? : CountryCode,            // ISO 3166-1 alpha-2
    numberOfResults ? : number,         // default 10, max 100
    dateRange ? : DateRange,            // ANYTIME, PAST_YEAR, PAST_MONTH, etc.
    options ? : {signal? : AbortSignal}
):
Promise<SearchResponse>
```

- `query` is required and trimmed.
- All other parameters are optional.
- Throws `APIError` on input validation error, network error, timeout, or invalid server response.

### Error Handling

Errors are instances of `APIError`:

```ts
try {
    await client.search("apple inc");
} catch (e) {
    if (e.name === "APIError") {
        console.error(e.status, e.message, e.details);
    }
}
```

### Schemas & Types

The client exports zod schemas and inferred TypeScript types:

```ts
import {
    SearchRequestSchema,
    SearchResponseSchema,
    type SearchRequest,
    type SearchResponse,
} from "@searchmcp/client";
```

## Development

```bash
pnpm install
pnpm test
```

Tests use [vitest](https://vitest.dev/) with fake timers and fetch mocks.

## License

MIT — see [LICENSE](./LICENSE).
