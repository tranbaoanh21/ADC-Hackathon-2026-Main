import type { AiPerception } from "../domain/types.js";

export interface AnalyseFramesInput {
  readonly requestId: string;
  readonly locale: string;
  readonly analysisMode: "LANDMARK_DISCOVERY" | "LANDMARK_OBSERVATION";
  readonly frames: readonly {
    readonly bytes: Buffer;
    readonly contentType: string;
  }[];
}

export interface AiAdapter {
  analyseFrames(input: AnalyseFramesInput): Promise<AiPerception>;
}

export type AiAdapterErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_INVALID_RESPONSE";

export class AiAdapterError extends Error {
  readonly code: AiAdapterErrorCode;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(
    code: AiAdapterErrorCode,
    message: string,
    options: { retryable: boolean; requestId?: string },
  ) {
    super(message);
    this.name = "AiAdapterError";
    this.code = code;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
  }
}
