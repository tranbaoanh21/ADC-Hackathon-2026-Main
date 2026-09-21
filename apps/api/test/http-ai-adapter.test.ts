import { describe, expect, it, vi } from "vitest";

import { AiAdapterError } from "../src/ai/ai-adapter.js";
import { HttpAiAdapter } from "../src/ai/http-ai-adapter.js";
import { createMockPerception } from "../src/ai/mock-ai-adapter.js";

const input = {
  requestId: "mobile-observation-1",
  locale: "vi-VN",
  analysisMode: "LANDMARK_DISCOVERY" as const,
  frames: [{ bytes: Buffer.from("frame"), contentType: "image/jpeg" }],
};

function adapter(fetchImplementation: typeof fetch, timeoutMs = 500) {
  return new HttpAiAdapter({
    baseUrl: "https://fastapi.example.test/",
    token: "test-only-token",
    timeoutMs,
    fetchImplementation,
  });
}

describe("HttpAiAdapter", () => {
  it("forwards contract metadata, ephemeral frames and server-side authorization", async () => {
    const perception = createMockPerception(input.requestId);
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const form = init?.body as FormData;
      expect(init?.headers).toEqual({ Authorization: "Bearer test-only-token" });
      expect(form.get("requestId")).toBe(input.requestId);
      expect(form.get("locale")).toBe("vi-VN");
      expect(form.get("analysisMode")).toBe("LANDMARK_DISCOVERY");
      expect(form.getAll("frames")).toHaveLength(1);
      return Response.json(perception);
    });

    await expect(adapter(fetchMock).analyseFrames(input)).resolves.toEqual(perception);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://fastapi.example.test/internal/v1/perception",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each([
    [401, "UNAUTHORIZED", false],
    [413, "PAYLOAD_TOO_LARGE", false],
    [422, "VALIDATION_ERROR", false],
    [503, "PROVIDER_UNAVAILABLE", true],
    [504, "PROVIDER_TIMEOUT", true],
  ] as const)("maps FastAPI status %s to %s", async (status, code, retryable) => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { code, message: "Internal detail", retryable, requestId: input.requestId } },
        { status },
      ),
    );

    const error = await adapter(fetchMock)
      .analyseFrames(input)
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(AiAdapterError);
    expect(error).toMatchObject({ code, retryable, requestId: input.requestId });
    expect((error as Error).message).not.toContain("Internal detail");
  });

  it("preserves FastAPI invalid-provider-response semantics for HTTP 503", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          error: {
            code: "PROVIDER_INVALID_RESPONSE",
            message: "Raw provider detail must not escape.",
            retryable: true,
            requestId: input.requestId,
          },
        },
        { status: 503 },
      ),
    );

    const error = await adapter(fetchMock)
      .analyseFrames(input)
      .catch((value: unknown) => value);
    expect(error).toMatchObject({
      code: "PROVIDER_INVALID_RESPONSE",
      retryable: true,
      requestId: input.requestId,
    });
    expect((error as Error).message).toBe("AI service returned an invalid provider response.");
  });

  it("does not trust an error code that conflicts with the HTTP status", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { code: "UNAUTHORIZED", message: "Internal detail", retryable: false } },
        { status: 503 },
      ),
    );

    await expect(adapter(fetchMock).analyseFrames(input)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      retryable: true,
      requestId: input.requestId,
    });
  });

  it("maps a local abort to a retryable provider timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new DOMException("aborted", "AbortError");
    });

    await expect(adapter(fetchMock).analyseFrames(input)).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
      retryable: true,
      requestId: input.requestId,
    });
  });

  it("aborts a slow upstream request at the configured Express timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async (_url, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    await expect(adapter(fetchMock, 5).analyseFrames(input)).rejects.toMatchObject({
      code: "PROVIDER_TIMEOUT",
      retryable: true,
    });
  });

  it("rejects invalid frame count, content type and size before calling FastAPI", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(adapter(fetchMock).analyseFrames({ ...input, frames: [] })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      retryable: false,
    });
    await expect(
      adapter(fetchMock).analyseFrames({
        ...input,
        frames: [{ bytes: Buffer.from("gif"), contentType: "image/gif" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      adapter(fetchMock).analyseFrames({
        ...input,
        frames: [{ bytes: Buffer.alloc(3 * 1024 * 1024 + 1), contentType: "image/jpeg" }],
      }),
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a successful non-JSON response as invalid provider output", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("not json"));

    await expect(adapter(fetchMock).analyseFrames(input)).rejects.toMatchObject({
      code: "PROVIDER_INVALID_RESPONSE",
      retryable: true,
    });
  });
});
