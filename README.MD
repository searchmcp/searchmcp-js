# @searchmcp/client

[![npm (scoped)](https://img.shields.io/npm/v/@searchmcp/client.svg)](https://www.npmjs.com/package/@searchmcp/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Thin TypeScript/JavaScript SDK for the [SearchMCP API](https://searchmcp.io).  
Generated from the [OpenAPI spec](https://searchmcp.io/openapi.json) using `typescript-fetch`.

Supports **REST (`/v1/search`)** endpoint.  
Includes full type definitions out of the box.

## Pre-Installation

Checkout

* 📚 [SearchMCP Docs](https://searchmcp.io/docs)
* 🔎 [SearchMCP API Reference](https://searchmcp.io/api-reference)

---

## Installation

```bash
npm install @searchmcp/client
# or
pnpm add @searchmcp/client
# or
yarn add @searchmcp/client
```

Requires Node.js **18+** (native `fetch`).

---

## Usage

```ts
import {createClient} from "@searchmcp/client";

const client = createClient(process.env.SEARCHMCP_API_KEY);

// Simple web search
const res = await client.search({
    query: "latest GPU deals",
    country: "US",
    numberOfResults: 5,
});

console.log(res.status);   // "SUCCESS"
console.log(res.results);  // array of results
```

---

## Client Factory

```ts
import {createClient, SearchMCPClient} from "@searchmcp/client";

const client: SearchMCPClient = createClient("smcp_123", "https://api.searchmcp.io");
```

- `apiKey` — required
- `basePath` — defaults to `https://api.searchmcp.io`

---

## Schemas & Types

All request/response schemas and types are generated from the OpenAPI spec and exported:

```ts
import {
    SearchRequest,
    SearchResponse,
    SearchStatus,
} from "@searchmcp/client";
```

See the interactive [API Reference](https://searchmcp.io/api-reference) for details:

- [SearchRequest model](https://searchmcp.io/api-reference#model/searchrequest)
- [SearchResponse model](https://searchmcp.io/api-reference#model/searchresponse)

---

## Development

```bash
pnpm install
pnpm generate   # re-generate from OpenAPI spec
pnpm build
```

---

## License

MIT — see [LICENSE](./LICENSE)
