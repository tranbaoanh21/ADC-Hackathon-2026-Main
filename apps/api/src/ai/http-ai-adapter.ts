import { type AiAdapter, AiAdapterError, type AnalyseFramesInput } from "./ai-adapter.js";

export interface HttpAiAdapterOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly timeoutMs: number;
  readonly fetchImplementation?: typeof fetch;
}

interface InternalAiErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly retryable?: boolean;
    readonly requestId?: string;
  };
}

const maximumFrameBytes = 3 * 1024 * 1024;

function sanitisedMessage(status: number): string {
  switch (status) {
    case 401:
      return "AI service authentication failed.";
    case 413:
      return "AI service rejected the frame payload size.";
    case 422:
      return "AI service rejected the perception request.";
    case 504:
      return "AI perception service timed out.";
    default:
      return "AI perception service is unavailable.";
  }
}

function statusErrorCode(status: number): ConstructorParameters<typeof AiAdapterError>[0] {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 413:
      return "PAYLOAD_TOO_LARGE";
    case 422:
      return "VALIDATION_ERROR";
    case 504:
      return "PROVIDER_TIMEOUT";
    default:
      return "PROVIDER_UNAVAILABLE";
  }
}

export class HttpAiAdapter implements AiAdapter {
  readonly #baseUrl: string;
  readonly #token: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: HttpAiAdapterOptions) {
    if (!options.baseUrl.trim()) {
      throw new Error("AI_SERVICE_URL is required for the live AI adapter.");
    }
    if (!options.token.trim()) {
      throw new Error("AI_SERVICE_TOKEN is required for the live AI adapter.");
    }
    if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1) {
      throw new Error("AI_TIMEOUT_MS must be a positive integer.");
    }
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#token = options.token;
    this.#timeoutMs = options.timeoutMs;
    this.#fetch = options.fetchImplementation ?? fetch;
  }

  async analyseFrames(input: AnalyseFramesInput) {
    if (input.frames.length < 1 || input.frames.length > 3) {
      throw new AiAdapterError(
        "VALIDATION_ERROR",
        "Between one and three perception frames are required.",
        { retryable: false, requestId: input.requestId },
      );
    }
    if (
      input.frames.some(
        (frame) => frame.contentType !== "image/jpeg" && frame.contentType !== "image/png",
      )
    ) {
      throw new AiAdapterError(
        "VALIDATION_ERROR",
        "Perception frames must be JPEG or PNG images.",
        { retryable: false, requestId: input.requestId },
      );
    }
    if (input.frames.some((frame) => frame.bytes.byteLength > maximumFrameBytes)) {
      throw new AiAdapterError(
        "PAYLOAD_TOO_LARGE",
        "A perception frame exceeded the three-megabyte limit.",
        { retryable: false, requestId: input.requestId },
      );
    }

    const form = new FormData();
    form.append("requestId", input.requestId);
    form.append("locale", input.locale);
    form.append("analysisMode", input.analysisMode);
    input.frames.forEach((frame, index) => {
      const bytes = Uint8Array.from(frame.bytes);
      form.append(
        "frames",
        new Blob([bytes], { type: frame.contentType }),
        `frame-${index + 1}.${frame.contentType === "image/png" ? "png" : "jpg"}`,
      );
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(`${this.#baseUrl}/internal/v1/perception`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.#token}` },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as InternalAiErrorBody | null;
        const code = statusErrorCode(response.status);
        throw new AiAdapterError(code, sanitisedMessage(response.status), {
          retryable:
            body?.error?.retryable ??
            (code === "PROVIDER_UNAVAILABLE" || code === "PROVIDER_TIMEOUT"),
          requestId: body?.error?.requestId ?? input.requestId,
        });
      }

      try {
        return (await response.json()) as Awaited<ReturnType<AiAdapter["analyseFrames"]>>;
      } catch {
        throw new AiAdapterError(
          "PROVIDER_INVALID_RESPONSE",
          "AI service returned a non-JSON response.",
          { retryable: true, requestId: input.requestId },
        );
      }
    } catch (error) {
      if (error instanceof AiAdapterError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiAdapterError("PROVIDER_TIMEOUT", "AI perception service timed out.", {
          retryable: true,
          requestId: input.requestId,
        });
      }
      throw new AiAdapterError("PROVIDER_UNAVAILABLE", "AI perception service is unavailable.", {
        retryable: true,
        requestId: input.requestId,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
