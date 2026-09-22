import { describe, expect, it } from "vitest";

import { mobileCopy } from "./i18n";
import {
  presentNavigationObservation,
  publishedWorkplaces,
  shouldApplyObservation,
} from "./mobile-state";
import type { ObservationResponse, WorkplaceSummary } from "./types";

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
  it("shows only published workplaces for everyday journeys", () => {
    const workplaces: WorkplaceSummary[] = [
      {
        id: "draft",
        name: "Draft office",
        status: "DRAFT",
        landmarkCount: 3,
        createdAt: "2026-09-23T00:00:00.000Z",
      },
      {
        id: "published",
        name: "Published office",
        status: "PUBLISHED",
        landmarkCount: 2,
        createdAt: "2026-09-22T00:00:00.000Z",
      },
      {
        id: "outdated",
        name: "Old office",
        status: "OUTDATED",
        landmarkCount: 4,
        createdAt: "2026-09-21T00:00:00.000Z",
      },
    ];

    expect(publishedWorkplaces(workplaces).map((item) => item.id)).toEqual(["published"]);
  });

  it("accepts only the latest observation response", () => {
    expect(shouldApplyObservation("request-current", "request-current")).toBe(true);
    expect(shouldApplyObservation("request-current", "request-old")).toBe(false);
  });

  it("keeps wrong landmark observations in a stop-and-rescan state", () => {
    const result = presentNavigationObservation(observation("STOP_AND_RESCAN"));
    expect(result.heading).toBe("Dừng lại và chụp lại");
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

  it("removes mixed English landmark terms from Vietnamese announcements", () => {
    const result = presentNavigationObservation(
      observation(
        "SEEKING_LANDMARK",
        "Đã xác nhận Reception. Đi thẳng đến Elevator Level 2, landmark tiếp theo.",
      ),
      "vi",
    );

    expect(result.message).toBe(
      "Đã xác nhận Quầy lễ tân. Đi thẳng đến Khu vực thang máy tầng 2, điểm mốc tiếp theo.",
    );
  });

  it("describes explicit capture instead of continuous automatic scanning", () => {
    expect(mobileCopy.en.captureLandmark).toBe("Capture landmark");
    expect(mobileCopy.vi.captureLandmark).toBe("Chụp điểm mốc");
    expect(mobileCopy.en.candidateFound("Blue chair")).toContain("Blue chair");
    expect(mobileCopy.vi.candidateFound("Chiếc ghế màu xanh")).toContain("Chiếc ghế màu xanh");
    expect(mobileCopy.vi.confirmCandidate).toBe("Lưu điểm mốc");
    expect(mobileCopy.en.learnCapturePurpose).not.toContain("Automatic scanning");
    expect(mobileCopy.vi.learnCapturePurpose).not.toContain("quét tự động");
  });
});
