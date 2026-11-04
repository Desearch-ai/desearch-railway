# Desearch Web Search API

A small Node HTTP service for Desearch web search, packaged for Railway. Uses Node's built-in HTTP server with no dependencies.

About Desearch: AI search, X search and web search for AI agents, plus page extraction and X data tools.

## Install

Use Node 22 or newer:

```sh
npm install
```

Set `DESEARCH_API_KEY` in your shell or deployment secret settings. The service reads this key only from the environment. Do not put it in source files. `PORT` is optional and defaults to 3000.

## Test

```sh
npm test
```

Tests start local HTTP servers and mock the upstream fetch. They require no API key or external network.

With `DESEARCH_API_KEY` set, run one actual search for `bittensor` with `num=3`:

```sh
npm run live
```

The live check starts a server on a random local port, calls `/search`, prints the result count and first title, then shuts down. A failed check exits with status 1 and a generic error message.

## Usage

```sh
npm start
curl 'http://localhost:3000/health'
curl 'http://localhost:3000/search?q=bittensor&num=3'
```

`GET /health` returns `{"status":"ok"}` without contacting Desearch. `GET /search` requires a nonempty `q`; `num` is a positive integer and defaults to 10. It calls `GET https://api.desearch.ai/web` with `query` and `num` and authenticates using only an `Authorization: Bearer` header.

Successful responses preserve the provider JSON, including this result structure:

```json
{"data":[{"title":"Example title","link":"https://example.org","snippet":"Example excerpt"}]}
```

Invalid parameters return 400, missing server configuration returns 503, and provider errors or invalid responses return 502 with a generic error. Unknown paths return 404; unsupported methods return 405. Upstream requests time out after 30 seconds.

The public search endpoint uses your configured key for every request. Control access to the deployed service according to your intended audience.

## Railway deployment and listing

1. Put this source in a repository you control.
2. Create a Railway project from that repository. The included `railway.json` selects the Dockerfile and `/health` health check.
3. Add the required `DESEARCH_API_KEY` service variable in Railway. Railway supplies `PORT`; an override is optional.
4. Deploy the service and generate a public domain. Verify `/health` and `/search?q=bittensor&num=3`.
5. Create a Railway template from the configured project. Use the name, description, and variable documentation in `template.md`. Mark `DESEARCH_API_KEY` as required input and keep your own value out of template defaults.
6. Review the template configuration, test a deployment from it, then submit its listing through Railway's template publishing flow.

This repository is template source; publishing and listing are separate steps performed in your Railway account.

## Links/Contact

- Docs: https://www.desearch.ai/docs/guide/sdk/mcp
- Contact: dev@desearch.ai
