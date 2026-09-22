import type { AiAdapter } from "./ai-adapter.js";
import { HttpAiAdapter } from "./http-ai-adapter.js";
import { MockAiAdapter } from "./mock-ai-adapter.js";

export type AiAdapterMode = "mock" | "live";

export interface RuntimeAiAdapter {
  readonly adapter: AiAdapter;
  readonly mode: AiAdapterMode;
}

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function createRuntimeAiAdapter(environment: RuntimeEnvironment): RuntimeAiAdapter {
  const configuredMode = environment.AI_ADAPTER?.trim().toLowerCase() || "mock";
  if (configuredMode === "mock") {
    return { adapter: new MockAiAdapter(), mode: "mock" };
  }
  if (configuredMode !== "live") {
    throw new Error('AI_ADAPTER must be either "mock" or "live".');
  }

  const parsedTimeout = Number.parseInt(environment.AI_TIMEOUT_MS ?? "35000", 10);
  return {
    adapter: new HttpAiAdapter({
      baseUrl: environment.AI_SERVICE_URL ?? "",
      token: environment.AI_SERVICE_TOKEN ?? "",
      timeoutMs: parsedTimeout,
    }),
    mode: "live",
  };
}
