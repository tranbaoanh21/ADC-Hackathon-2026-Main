import { describe, expect, it } from "vitest";

import { HttpAiAdapter } from "../src/ai/http-ai-adapter.js";
import { MockAiAdapter } from "../src/ai/mock-ai-adapter.js";
import { createRuntimeAiAdapter } from "../src/ai/runtime-ai-adapter.js";

describe("createRuntimeAiAdapter", () => {
  it("defaults to an explicit deterministic mock", () => {
    const runtime = createRuntimeAiAdapter({});
    expect(runtime.mode).toBe("mock");
    expect(runtime.adapter).toBeInstanceOf(MockAiAdapter);
  });

  it("creates the live adapter only with required server-side configuration", () => {
    const runtime = createRuntimeAiAdapter({
      AI_ADAPTER: "live",
      AI_SERVICE_URL: "https://fastapi.example.test",
      AI_SERVICE_TOKEN: "test-only-token",
      AI_TIMEOUT_MS: "7000",
    });
    expect(runtime.mode).toBe("live");
    expect(runtime.adapter).toBeInstanceOf(HttpAiAdapter);
  });

  it("fails fast on missing live credentials or an unknown mode", () => {
    expect(() => createRuntimeAiAdapter({ AI_ADAPTER: "live" })).toThrow(
      "AI_SERVICE_URL is required",
    );
    expect(() => createRuntimeAiAdapter({ AI_ADAPTER: "fallback" })).toThrow(
      'AI_ADAPTER must be either "mock" or "live"',
    );
  });
});
