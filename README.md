<p align="center">
  <a href="https://recomma.ai"><img src="extension/icons/icon128.png" width="64" height="64" alt="Recomma"></a>
</p>

<h1 align="center">Recomma</h1>

<p align="center">
  Open-source tools from <a href="https://recomma.ai"><b>Recomma</b></a>, which tracks what ChatGPT, Gemini and Google's AI Overviews and AI Mode say about your brand, and which sources they cite.
</p>

<p align="center">
  <a href="https://recomma.ai">Website</a> ·
  <a href="https://docs.recomma.ai">Docs</a> ·
  <a href="https://docs.recomma.ai/reference/mcp">MCP server</a> ·
  <a href="https://recomma.ai/pricing">Pricing</a>
</p>

---

## What is in here

| | What it does |
| --- | --- |
| [`packages/recomma`](packages/recomma) | **`npx recomma`**: a CLI and a typed TypeScript SDK for the Recomma API. Read visibility, share of voice and cited sources from a terminal or a script, and connect the MCP server to Claude, Codex, Cursor or VS Code in one command. |
| [`extension`](extension) | **AI Answer Sources**, a Chrome extension. Open it on a ChatGPT, Perplexity, Gemini or Google AI Mode answer and it lists every source the answer links to, grouped by domain, with your own site highlighted. |

## Why the sources an answer shows matter

An AI answer is assembled from the pages the engine retrieves, and the pages it cites are the ones a reader can click. In [our study](https://recomma.ai/blog/chatgpt-interface-vs-api) of 100 buying questions, each asked in ChatGPT's interface and through its API with search, **the cited pages overlapped only 8% of the time**, and the interface cited 7.8 domains per answer to the API's 3.2. A tool that only calls the API misses most of what people are actually shown.

The extension shows you one answer as a reader sees it. [Recomma](https://recomma.ai) does the same thing for every question in your category, on every engine, every day, with the sample size beside every figure.

## Quick start

```bash
# Connect Recomma to your AI assistant (Claude Code shown)
npx recomma mcp claude

# Or read your figures directly (REST API, Scale plan)
export RECOMMA_API_KEY=recomma_…
npx recomma brands
npx recomma visibility <brandId> --days 30
npx recomma sources <brandId> --kind competitor
```

Make a key under **Settings → Connect AI** at [recomma.ai](https://recomma.ai/settings/mcp).

## License

MIT © [Recomma](https://recomma.ai)
