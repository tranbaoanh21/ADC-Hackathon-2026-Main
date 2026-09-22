import { describe, expect, it } from "vitest";

import {
  createNavigationSession,
  transitionNavigationSession,
} from "../src/domain/navigation-session.js";
import { demoGraph, demoLandmarkIds } from "../src/fixtures/demo-graph.js";

const sessionId = "46fe5f2d-65c3-4322-b2a9-5cf46139975f";

function createMeetingRoomSession() {
  return createNavigationSession({
    id: sessionId,
    graph: demoGraph,
    originLandmarkId: demoLandmarkIds.reception,
    destinationLandmarkId: demoLandmarkIds.meetingRoom,
    startedAt: "2026-09-22T08:00:00+07:00",
  });
}

describe("navigation session", () => {
  it("starts by waiting for confirmation of the selected origin", () => {
    const session = createMeetingRoomSession();

    expect(session.status).toBe("AWAITING_START_CONFIRMATION");
    expect(session.currentPathIndex).toBe(0);
    expect(session.expectedLandmarkId).toBe(demoLandmarkIds.reception);
  });

  it("does not advance or issue a movement cue for a wrong origin", () => {
    const session = createMeetingRoomSession();
    const transition = transitionNavigationSession(
      session,
      demoGraph,
      "NOT_MATCHED",
      "2026-09-22T08:00:01+07:00",
    );

    expect(transition.session).toBe(session);
    expect(transition.routeState).toBe("AWAITING_START_CONFIRMATION");
    expect(transition.shouldAdvance).toBe(false);
    expect(transition.spokenMessage).not.toMatch(/đi thẳng|rẽ trái|rẽ phải/i);
  });

  it("confirms Reception and speaks the reviewed cue to Elevator", () => {
    const transition = transitionNavigationSession(
      createMeetingRoomSession(),
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:01+07:00",
    );

    expect(transition.session.status).toBe("ACTIVE");
    expect(transition.session.currentPathIndex).toBe(1);
    expect(transition.session.expectedLandmarkId).toBe(demoLandmarkIds.elevator);
    expect(transition.spokenMessage).toMatch(/đi thẳng/i);
    expect(transition.shouldAdvance).toBe(true);
  });

  it("derives an English instruction from the reviewed maneuver", () => {
    const transition = transitionNavigationSession(
      createMeetingRoomSession(),
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:01+07:00",
      "en-US",
    );

    expect(transition.spokenMessage).toBe(
      "Reception confirmed. Continue straight to Elevator Level 2.",
    );
  });

  it("stops and rescans without advancing on insufficient intermediate evidence", () => {
    const active = transitionNavigationSession(
      createMeetingRoomSession(),
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:01+07:00",
    ).session;
    const transition = transitionNavigationSession(
      active,
      demoGraph,
      "INSUFFICIENT_EVIDENCE",
      "2026-09-22T08:00:02+07:00",
    );

    expect(transition.session).toBe(active);
    expect(transition.routeState).toBe("STOP_AND_RESCAN");
    expect(transition.shouldAdvance).toBe(false);
  });

  it("advances from Elevator to Meeting Room with the reviewed left-turn cue", () => {
    const active = transitionNavigationSession(
      createMeetingRoomSession(),
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:01+07:00",
    ).session;
    const transition = transitionNavigationSession(
      active,
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:02+07:00",
    );

    expect(transition.session.currentPathIndex).toBe(2);
    expect(transition.session.expectedLandmarkId).toBe(demoLandmarkIds.meetingRoom);
    expect(transition.spokenMessage).toMatch(/rẽ trái/i);
  });

  it("completes only after the destination is matched", () => {
    const atElevator = transitionNavigationSession(
      createMeetingRoomSession(),
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:01+07:00",
    ).session;
    const atMeetingRoom = transitionNavigationSession(
      atElevator,
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:02+07:00",
    ).session;
    const completed = transitionNavigationSession(
      atMeetingRoom,
      demoGraph,
      "MATCHED",
      "2026-09-22T08:00:03+07:00",
    );

    expect(completed.session.status).toBe("COMPLETED");
    expect(completed.session.expectedLandmarkId).toBeNull();
    expect(completed.routeState).toBe("ROUTE_COMPLETED");
    expect(completed.spokenMessage).toContain("Meeting Room A");
  });
});
