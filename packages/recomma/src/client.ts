/**
 * A typed client for the Recomma REST API.
 *
 * Every endpoint is a POST with a JSON body, and its path is the procedure's
 * name — `overview/summary`, `source/list` — so `call` reaches all of them,
 * and the named methods are the handful worth typing by hand. The full list
 * is the OpenAPI document at https://api.recomma.ai/v1/spec.json.
 */

export const DEFAULT_BASE_URL = "https://api.recomma.ai/v1";

/** Where a key is made. Shown whenever one is missing or refused. */
export const KEYS_URL = "https://recomma.ai/settings/mcp";

export type Engine = string;

export interface RecommaOptions {
  /** A `recomma_…` key. Falls back to `RECOMMA_API_KEY`. */
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface Window {
  /** ISO country code. Absent means every country sampled. */
  country?: string;
  /** 1–365. The API defaults to 30. */
  days?: number;
  /** Engine slug, e.g. `chatgpt`. Absent means every engine sampled. */
  engine?: Engine;
}

export interface Brand {
  createdAt: string;
  description: string | null;
  domain: string;
  id: string;
  locale: string;
  name: string;
}

export interface Standing {
  avgPosition: number | null;
  name: string;
  /** The answers behind every figure on this row. */
  sampleN: number;
  shareOfVoice: number;
  visibility: number;
  winRate: number;
}

export interface Summary {
  brand: (Standing & { interval: [number, number] | null }) | null;
  byEngine: { engine: Engine; sampleN: number; visibility: number }[];
  domainTypes: { kind: string; retrievals: number; share: number }[];
  leaderboard: (Standing & { kind: string })[];
}

export type SourceKind =
  | "competitor"
  | "corporate"
  | "editorial"
  | "institutional"
  | "owned"
  | "reference"
  | "ugc"
  | "unknown";

export interface SourceRow {
  citationRate: number;
  citations: number;
  key: string;
  kind: SourceKind;
  retrievals: number;
}

export interface SourceList {
  /** Answers in the window, the denominator every row is read against. */
  answers: number;
  rows: SourceRow[];
  total: number;
}

export class RecommaError extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RecommaError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The gateway refuses with `{ error, hint }`; a procedure fails with
 * `{ code, message }`. Both end up as one error with a code.
 */
function errorFor(status: number, body: unknown): RecommaError {
  const parsed = (body ?? {}) as {
    code?: string;
    error?: string;
    hint?: string;
    message?: string;
  };
  const code = parsed.error ?? parsed.code;
  if (status === 401) {
    return new RecommaError(
      `The API key was refused. Make one at ${KEYS_URL}.`,
      status,
      code
    );
  }
  if (code === "plan_required") {
    return new RecommaError(
      "The REST API is on the Scale plan. The same key works with the MCP server on every plan — run `recomma mcp`.",
      status,
      code
    );
  }
  return new RecommaError(
    parsed.message ?? parsed.hint ?? `Request failed with ${status}`,
    status,
    code
  );
}

export function createClient(options: RecommaOptions = {}) {
  const apiKey = options.apiKey ?? process.env.RECOMMA_API_KEY;
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;

  /** Calls any procedure by name, e.g. `call("prompt/list", { projectId })`. */
  async function call<T = unknown>(
    procedure: string,
    input: object = {}
  ): Promise<T> {
    if (!apiKey) {
      throw new RecommaError(
        `No API key. Set RECOMMA_API_KEY, or make one at ${KEYS_URL}.`,
        401
      );
    }
    const response = await doFetch(
      `${baseUrl}/${procedure.replace(/^\//, "")}`,
      {
        body: JSON.stringify(input),
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
      }
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw errorFor(response.status, body);
    }
    return body as T;
  }

  return {
    /** The work queue for one brand. */
    actions: (projectId: string) => call("action/list", { projectId }),
    /** The brands in the workspace, with their ids. */
    brands: () => call<Brand[]>("project/list"),
    call,
    /** The tracked questions, with their figures. */
    prompts: (projectId: string, window: Window = {}) =>
      call("prompt/list", { projectId, ...window }),
    /** The domains the answers retrieve and cite. */
    sources: (
      projectId: string,
      options: Window & { kinds?: SourceKind[]; offset?: number } = {}
    ) => call<SourceList>("source/list", { projectId, ...options }),
    /** Visibility, share of voice, win rate and position, with sample sizes. */
    summary: (projectId: string, window: Window = {}) =>
      call<Summary>("overview/summary", { projectId, ...window }),
  };
}

export type RecommaClient = ReturnType<typeof createClient>;
