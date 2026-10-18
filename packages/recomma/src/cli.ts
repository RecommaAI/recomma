#!/usr/bin/env node
import { parseArgs } from "node:util";

import {
  createClient,
  KEYS_URL,
  RecommaError,
  type SourceKind,
  type Window,
} from "./client.js";

const MCP_URL = "https://api.recomma.ai/mcp";
const DOCS_URL = "https://docs.recomma.ai/reference/mcp";

const HELP = `recomma — what ChatGPT, Gemini and Google's AI answers say about your brand

Usage
  recomma brands                       The brands in your workspace, with ids
  recomma visibility <brandId>         Visibility, share of voice and position, per engine
  recomma sources <brandId>            The domains AI answers retrieve and cite
  recomma call <procedure> [json]      Any API procedure, e.g. prompt/list '{"projectId":"…"}'
  recomma mcp [client]                 Connect the MCP server to claude, codex, cursor or vscode

Options
  --days <n>       Window in days (default 30)
  --engine <slug>  One engine only, e.g. chatgpt
  --country <cc>   One country only, e.g. US
  --kind <kind>    sources: owned, competitor, editorial, ugc, …
  --json           Print the raw response

Set RECOMMA_API_KEY to a key from ${KEYS_URL}.
The REST API is on the Scale plan; the MCP server works on every plan.
https://recomma.ai`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    country: { type: "string" },
    days: { type: "string" },
    engine: { type: "string" },
    help: { short: "h", type: "boolean" },
    json: { type: "boolean" },
    kind: { multiple: true, type: "string" },
  },
});

const [command, ...rest] = positionals;

const window: Window = {
  country: values.country,
  days: values.days ? Number(values.days) : undefined,
  engine: values.engine,
};

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

function print(rows: Record<string, string | number>[]) {
  if (rows.length === 0) {
    console.log("Nothing in this window.");
    return;
  }
  console.table(rows);
}

function requireBrand(): string {
  const [brandId] = rest;
  if (!brandId) {
    throw new RecommaError(
      "Which brand? Run `recomma brands` for the ids.",
      400
    );
  }
  return brandId;
}

const MCP_SETUP: Record<string, string> = {
  claude: `claude mcp add --transport http --scope user recomma ${MCP_URL}`,
  codex: `codex mcp add recomma --url ${MCP_URL}`,
  cursor: `Add to ~/.cursor/mcp.json:\n${JSON.stringify(
    { mcpServers: { recomma: { url: MCP_URL } } },
    null,
    2
  )}`,
  vscode: `code --add-mcp '${JSON.stringify({ name: "recomma", type: "http", url: MCP_URL })}'`,
};

function mcp(client: string | undefined) {
  const chosen = client ? MCP_SETUP[client] : undefined;
  if (client && !chosen) {
    throw new RecommaError(
      `No setup for "${client}". Try ${Object.keys(MCP_SETUP).join(", ")}.`,
      400
    );
  }
  const entries = chosen
    ? [[client as string, chosen]]
    : Object.entries(MCP_SETUP);
  for (const [name, setup] of entries) {
    console.log(`# ${name}\n${setup}\n`);
  }
  console.log(
    `The first call opens a browser to sign in. For a key instead, see ${DOCS_URL}`
  );
}

async function main() {
  if (!command || values.help) {
    console.log(HELP);
    return;
  }
  if (command === "mcp") {
    mcp(rest[0]);
    return;
  }

  const client = createClient();

  switch (command) {
    case "brands": {
      const brands = await client.brands();
      if (values.json) {
        console.log(JSON.stringify(brands, null, 2));
        return;
      }
      print(
        brands.map((brand) => ({
          domain: brand.domain,
          id: brand.id,
          name: brand.name,
        }))
      );
      return;
    }
    case "visibility": {
      const summary = await client.summary(requireBrand(), window);
      if (values.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }
      const { brand } = summary;
      if (!brand) {
        console.log("No answers yet for this brand in this window.");
        return;
      }
      console.log(
        `${brand.name}: named in ${percent(brand.visibility)} of ${brand.sampleN} answers, ` +
          `share of voice ${percent(brand.shareOfVoice)}, ` +
          `named first in ${percent(brand.winRate)}` +
          (brand.avgPosition ? `, average position ${brand.avgPosition.toFixed(1)}` : "")
      );
      print(
        summary.byEngine.map((row) => ({
          answers: row.sampleN,
          engine: row.engine,
          visibility: percent(row.visibility),
        }))
      );
      return;
    }
    case "sources": {
      const list = await client.sources(requireBrand(), {
        ...window,
        kinds: values.kind as SourceKind[] | undefined,
      });
      if (values.json) {
        console.log(JSON.stringify(list, null, 2));
        return;
      }
      console.log(`${list.total} domains across ${list.answers} answers`);
      print(
        list.rows.map((row) => ({
          citations: row.citations,
          domain: row.key,
          kind: row.kind,
          retrievals: row.retrievals,
        }))
      );
      return;
    }
    case "call": {
      const [procedure, input] = rest;
      if (!procedure) {
        throw new RecommaError("Which procedure? e.g. `recomma call project/list`", 400);
      }
      const result = await client.call(procedure, input ? JSON.parse(input) : {});
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    default:
      console.log(HELP);
      process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
