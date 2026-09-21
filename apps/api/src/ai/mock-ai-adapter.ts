import type { AiPerception, CandidateLandmark, FrameQuality } from "../domain/types.js";
import type { AiAdapter, AnalyseFramesInput } from "./ai-adapter.js";

const elevatorCandidate: CandidateLandmark = {
  proposedName: "Elevator Level 2",
  type: "ELEVATOR_AREA",
  visibleText: ["LEVEL 2"],
  stableFeatures: ["Level 2 sign beside the elevator"],
  draftDescription: "Khu vực thang máy có biển LEVEL 2.",
  transientFeatures: ["One person passing through the frame"],
};

export function createMockPerception(
  requestId: string,
  options: {
    frameQuality?: FrameQuality;
    detectedText?: readonly string[];
    candidate?: CandidateLandmark | null;
    uncertaintyReasons?: readonly string[];
  } = {},
): AiPerception {
  const candidate = options.candidate === undefined ? elevatorCandidate : options.candidate;

  return {
    schemaVersion: "1.0",
    requestId,
    frameQuality: options.frameQuality ?? "USABLE",
    detectedText: options.detectedText ?? candidate?.visibleText ?? [],
    sceneType: candidate?.type === "RECEPTION" ? "RECEPTION" : "ELEVATOR_AREA",
    landmarkCandidates: candidate ? [candidate] : [],
    uncertaintyReasons: options.uncertaintyReasons ?? [],
    model: {
      provider: "mock",
      modelId: "deterministic-landmark-fixture",
      promptVersion: "landmark-perception-v1",
    },
    processingTimeMs: 25,
  };
}

export class MockAiAdapter implements AiAdapter {
  async analyseFrames(input: AnalyseFramesInput): Promise<AiPerception> {
    return createMockPerception(input.requestId);
  }
}

export class ScriptedAiAdapter implements AiAdapter {
  readonly #responses: (AiPerception | Error)[];

  constructor(responses: readonly (AiPerception | Error)[]) {
    this.#responses = [...responses];
  }

  async analyseFrames(input: AnalyseFramesInput): Promise<AiPerception> {
    const next = this.#responses.shift();
    if (!next) {
      throw new Error(`No scripted AI response remains for ${input.requestId}.`);
    }
    if (next instanceof Error) {
      throw next;
    }
    return { ...next, requestId: input.requestId };
  }
}
