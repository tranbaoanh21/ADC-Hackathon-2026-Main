import { describe, expect, it } from "vitest";

import { presentNavigationObservation, shouldApplyObservation } from "./mobile-state";
import type { ObservationResponse } from "./types";

function observation(
  routeState: ObservationResponse["routeState"],
  spokenMessage = "Thông báo kiểm thử",
): ObservationResponse {
  return {
    requestId: "request-current",
    observationId: "00000000-0000-4000-8000-000000000001",
    sessionMode: "NAVIGATE",
    routeState,
    landmarkMatchStatus: routeState === "STOP_AND_RESCAN" ? "NOT_MATCHED" : "MATCHED",
    candidateLandmark: null,
    expectedLandmark: null,
    spokenMessage,
    shouldAdvance: routeState === "SEEKING_LANDMARK" || routeState === "ROUTE_COMPLETED",
    retryAllowed: routeState !== "ROUTE_COMPLETED",
  };
}

describe("mobile observation guards", () => {
  it("accepts only the latest observation response", () => {
    expect(shouldApplyObservation("request-current", "request-current")).toBe(true);
    expect(shouldApplyObservation("request-current", "request-old")).toBe(false);
  });

  it("keeps wrong landmark observations in a stop-and-rescan state", () => {
    const result = presentNavigationObservation(observation("STOP_AND_RESCAN"));
    expect(result.heading).toBe("Dừng lại và quét lại");
    expect(result.completed).toBe(false);
  });

  it("does not treat an unconfirmed origin as movement permission", () => {
    const result = presentNavigationObservation(observation("AWAITING_START_CONFIRMATION"));
    expect(result.tone).toBe("warning");
    expect(result.completed).toBe(false);
  });

  it("marks only the route-completed response as complete", () => {
    expect(presentNavigationObservation(observation("SEEKING_LANDMARK")).completed).toBe(false);
    expect(presentNavigationObservation(observation("ROUTE_COMPLETED")).completed).toBe(true);
  });
});
