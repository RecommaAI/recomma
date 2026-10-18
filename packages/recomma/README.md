# recomma

The CLI and SDK for [Recomma](https://recomma.ai), which tracks what ChatGPT, Gemini and Google's AI Overviews and AI Mode say about your brand, and which sources they cite.

## Connect your AI assistant (every plan)

```bash
npx recomma mcp            # setup for every client
npx recomma mcp claude     # or one: claude, codex, cursor, vscode
```

This prints the one-line setup for the [Recomma MCP server](https://docs.recomma.ai/reference/mcp) at `https://api.recomma.ai/mcp`. The first call opens a browser to sign in. After that your assistant can read your visibility, the answers themselves, the sources they cite and your action queue.

## CLI (REST API, Scale plan)

```bash
export RECOMMA_API_KEY=recomma_…   # Settings → Connect AI → API keys

npx recomma brands
npx recomma visibility <brandId> --days 30 --engine chatgpt
npx recomma sources <brandId> --kind competitor --kind ugc
npx recomma call prompt/list '{"projectId":"<brandId>"}'
```

`--json` prints the raw response for any command.

## SDK

```ts
import { createClient } from "recomma";

const recomma = createClient({ apiKey: process.env.RECOMMA_API_KEY });

const [brand] = await recomma.brands();
const summary = await recomma.summary(brand.id, { days: 30 });

console.log(
  `${summary.brand?.name} is named in ${summary.brand?.visibility} of ${summary.brand?.sampleN} answers`
);

// Any procedure in https://api.recomma.ai/v1/spec.json
const prompts = await recomma.call("prompt/list", { projectId: brand.id });
```

Every share comes with the number of answers behind it (`sampleN`). Read a share next to its sample, not on its own.

Errors are thrown as `RecommaError` with the HTTP `status` and a `code`. `plan_required` means the workspace is below Scale.

## Links

- [Recomma](https://recomma.ai)
- [Docs](https://docs.recomma.ai)
- [REST API reference](https://docs.recomma.ai/reference/api)
- [Source on GitHub](https://github.com/RecommaAI/recomma)

MIT
