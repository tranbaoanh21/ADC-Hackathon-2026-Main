import { describe, expect, it } from "vitest";

import { matchExpectedLandmark, normalizeLandmarkText } from "../src/domain/landmark-match.js";
import { demoGraph } from "../src/fixtures/demo-graph.js";

const reception = demoGraph.landmarks[0];

describe("landmark text matching", () => {
  it("normalises case, accents and punctuation deterministically", () => {
    expect(normalizeLandmarkText("  Lễ-tân!  ")).toBe("LE TAN");
  });

  it("matches visible text contained in OCR output", () => {
    expect(
      matchExpectedLandmark(
        { frameQuality: "USABLE", detectedText: ["Welcome to RECEPTION desk"] },
        reception,
      ),
    ).toBe("MATCHED");
  });

  it("does not match different usable text", () => {
    expect(
      matchExpectedLandmark(
        { frameQuality: "USABLE", detectedText: ["MEETING ROOM A"] },
        reception,
      ),
    ).toBe("NOT_MATCHED");
  });

  it("matches a demo object without printed text from its reviewed name", () => {
    const chair = {
      ...reception,
      name: "Blue chair",
      visibleText: [],
      stableFeatures: ["blue plastic chair"],
    };

    expect(
      matchExpectedLandmark(
        {
          frameQuality: "USABLE",
          detectedText: [],
          candidateName: "Chair",
          candidateStableFeatures: ["blue plastic chair beside a white wall"],
        },
        chair,
      ),
    ).toBe("MATCHED");
  });

  it("never matches an unreadable frame", () => {
    expect(
      matchExpectedLandmark({ frameQuality: "BLURRY", detectedText: ["RECEPTION"] }, reception),
    ).toBe("INSUFFICIENT_EVIDENCE");
  });
});
