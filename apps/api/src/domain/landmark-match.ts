import type { Landmark, LandmarkMatchStatus, PerceptionEvidence } from "./types.js";

export function normalizeLandmarkText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("vi-VN")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchExpectedLandmark(
  evidence: PerceptionEvidence,
  expectedLandmark: Landmark,
): LandmarkMatchStatus {
  if (evidence.frameQuality !== "USABLE") {
    return "INSUFFICIENT_EVIDENCE";
  }

  const expectedTexts = [
    expectedLandmark.name,
    ...expectedLandmark.visibleText,
    ...expectedLandmark.stableFeatures,
  ]
    .map(normalizeLandmarkText)
    .filter((value) => value.length > 0);
  const observedTexts = [
    ...evidence.detectedText,
    evidence.candidateName ?? "",
    ...(evidence.candidateVisibleText ?? []),
    ...(evidence.candidateStableFeatures ?? []),
  ]
    .map(normalizeLandmarkText)
    .filter((value) => value.length > 0);

  if (expectedTexts.length === 0 || observedTexts.length === 0) {
    return "INSUFFICIENT_EVIDENCE";
  }

  const matched = expectedTexts.some((expected) =>
    observedTexts.some(
      (observed) =>
        observed === expected || observed.includes(expected) || expected.includes(observed),
    ),
  );

  return matched ? "MATCHED" : "NOT_MATCHED";
}
