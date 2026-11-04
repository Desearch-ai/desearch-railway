# Template name

Desearch Web Search API

## Description

A small Node HTTP service that exposes Desearch web search through a JSON endpoint. Includes a Docker build and a health endpoint for Railway.

About Desearch: AI search, X search and web search for AI agents, plus page extraction and X data tools.

## Required variables

| Variable | Description |
| --- | --- |
| `DESEARCH_API_KEY` | Your Desearch API key. Set this as a secret service variable. |

## Optional variables

| Variable | Description |
| --- | --- |
| `PORT` | HTTP listening port. Defaults to 3000 locally; Railway supplies it when deployed. |

## Deployment configuration

Build with the repository Dockerfile. Use `/health` as the health check path and generate a public domain to access `/search`.
