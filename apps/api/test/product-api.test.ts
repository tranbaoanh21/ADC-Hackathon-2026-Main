import request from "supertest";
import { describe, expect, it } from "vitest";

import { type AiAdapter, AiAdapterError, type AnalyseFramesInput } from "../src/ai/ai-adapter.js";
import { createMockPerception, ScriptedAiAdapter } from "../src/ai/mock-ai-adapter.js";
import { createApp } from "../src/app.js";
import type { CandidateLandmark } from "../src/domain/types.js";
import { demoGraph, demoLandmarkIds } from "../src/fixtures/demo-graph.js";
import { InMemoryProductRepository } from "../src/repositories/in-memory-product-repository.js";

const sessionId = "46fe5f2d-65c3-4322-b2a9-5cf46139975f";
const observationId = "45df165f-d325-46bc-89d1-a8f0f686c445";
const nextObservationId = "a213d2cf-0258-49ec-87c4-70cd7da496ca";

const receptionCandidate: CandidateLandmark = {
  proposedName: "Reception",
  type: "RECEPTION",
  visibleText: ["RECEPTION"],
  stableFeatures: ["Reception sign above the front desk"],
  draftDescription: "Biển RECEPTION tại quầy lễ tân.",
};

const restroomCandidate: CandidateLandmark = {
  proposedName: "Restroom Level 2",
  type: "RESTROOM",
  visibleText: ["RESTROOM"],
  stableFeatures: ["Restroom sign beside the corridor entrance"],
  draftDescription: "Biển RESTROOM tại hành lang tầng 2.",
};

function idSequence(ids: readonly string[]): () => string {
  const values = [...ids];
  return () => {
    const value = values.shift();
    if (!value) {
      throw new Error("The test UUID sequence is exhausted.");
    }
    return value;
  };
}

function attachObservation(
  pending: request.Test,
  clientRequestId: string,
  capturedAt: string,
): request.Test {
  return pending
    .field("clientRequestId", clientRequestId)
    .field("capturedAt", capturedAt)
    .attach("frames", Buffer.from("representative-image"), {
      filename: "frame.jpg",
      contentType: "image/jpeg",
    });
}

describe("PathMemory Product API v3 contract", () => {
  it("lists workplace summaries without requiring route IDs from the admin", async () => {
    const response = await request(createApp()).get("/api/v2/routes");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: demoGraph.id,
        name: demoGraph.name,
        status: demoGraph.status,
        landmarkCount: demoGraph.landmarks.length,
        createdAt: demoGraph.createdAt,
      },
    ]);
  });

  it("returns the published graph and deterministic reachable destinations", async () => {
    const app = createApp();

    const graphResponse = await request(app).get(`/api/v2/routes/${demoGraph.id}`);
    expect(graphResponse.status).toBe(200);
    expect(graphResponse.body).toEqual(demoGraph);

    const reachable = await request(app)
      .get(`/api/v2/routes/${demoGraph.id}/reachable-destinations`)
      .query({ originLandmarkId: demoLandmarkIds.reception });
    expect(reachable.status).toBe(200);
    expect(reachable.body.destinations.map((item: { id: string }) => item.id)).toEqual([
      demoLandmarkIds.elevator,
      demoLandmarkIds.meetingRoom,
      demoLandmarkIds.restroom,
    ]);
  });

  it("plans a navigation session with the canonical BFS path", async () => {
    const app = createApp({
      now: () => "2026-09-22T08:00:00+07:00",
      newId: () => sessionId,
    });
    const response = await request(app).post(`/api/v2/routes/${demoGraph.id}/sessions`).send({
      mode: "NAVIGATE",
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.meetingRoom,
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("AWAITING_START_CONFIRMATION");
    expect(response.body.plannedPath.landmarkIds).toEqual([
      demoLandmarkIds.reception,
      demoLandmarkIds.elevator,
      demoLandmarkIds.meetingRoom,
    ]);
  });

  it("does not advance on the wrong start landmark and advances on confirmed Reception", async () => {
    const ai = new ScriptedAiAdapter([
      createMockPerception("ignored", { detectedText: ["LEVEL 2"] }),
      createMockPerception("ignored", {
        detectedText: ["RECEPTION"],
        candidate: receptionCandidate,
      }),
    ]);
    const app = createApp({
      aiAdapter: ai,
      now: () => "2026-09-22T08:00:00+07:00",
      newId: idSequence([sessionId, observationId, nextObservationId]),
    });
    await request(app).post(`/api/v2/routes/${demoGraph.id}/sessions`).send({
      mode: "NAVIGATE",
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.meetingRoom,
    });

    const wrong = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-nav-001",
      "2026-09-22T08:00:01+07:00",
    );
    expect(wrong.status).toBe(200);
    expect(wrong.body.routeState).toBe("AWAITING_START_CONFIRMATION");
    expect(wrong.body.shouldAdvance).toBe(false);
    expect(wrong.body.spokenMessage).not.toMatch(/đi thẳng|rẽ trái|rẽ phải/i);

    const confirmed = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-nav-002",
      "2026-09-22T08:00:02+07:00",
    );
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.routeState).toBe("SEEKING_LANDMARK");
    expect(confirmed.body.expectedLandmark.id).toBe(demoLandmarkIds.elevator);
    expect(confirmed.body.spokenMessage).toMatch(/đi thẳng/i);
  });

  it("completes the Reception to Restroom path and never advances on an unreadable frame", async () => {
    const ai = new ScriptedAiAdapter([
      createMockPerception("ignored", {
        detectedText: ["RECEPTION"],
        candidate: receptionCandidate,
      }),
      createMockPerception("ignored", {
        frameQuality: "UNREADABLE",
        detectedText: [],
        candidate: null,
        uncertaintyReasons: ["The sign is outside the frame."],
      }),
      createMockPerception("ignored"),
      createMockPerception("ignored", {
        detectedText: ["RESTROOM"],
        candidate: restroomCandidate,
      }),
    ]);
    const app = createApp({
      aiAdapter: ai,
      now: () => "2026-09-22T08:00:00+07:00",
      newId: idSequence([
        sessionId,
        observationId,
        nextObservationId,
        "d2af7a2b-1257-443b-9686-f5b96dfa9af5",
        "b7ef0b76-d5d1-4d3f-9576-c4b5a2240392",
      ]),
    });
    await request(app).post(`/api/v2/routes/${demoGraph.id}/sessions`).send({
      mode: "NAVIGATE",
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.restroom,
    });

    const start = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "restroom-001",
      "2026-09-22T08:00:01+07:00",
    );
    expect(start.body.expectedLandmark.id).toBe(demoLandmarkIds.elevator);

    const unreadable = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "restroom-002",
      "2026-09-22T08:00:02+07:00",
    );
    expect(unreadable.body.routeState).toBe("STOP_AND_RESCAN");
    expect(unreadable.body.shouldAdvance).toBe(false);

    const elevator = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "restroom-003",
      "2026-09-22T08:00:03+07:00",
    );
    expect(elevator.body.expectedLandmark.id).toBe(demoLandmarkIds.restroom);
    expect(elevator.body.spokenMessage).toMatch(/rẽ phải/i);

    const destination = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "restroom-004",
      "2026-09-22T08:00:04+07:00",
    );
    expect(destination.body.routeState).toBe("ROUTE_COMPLETED");
    expect(destination.body.shouldAdvance).toBe(true);
    expect(destination.body.spokenMessage).toContain("Nhà vệ sinh tầng 2");
  });

  it("rejects duplicate and stale observations before invoking AI again", async () => {
    let callCount = 0;
    const ai: AiAdapter = {
      async analyseFrames(input: AnalyseFramesInput) {
        callCount += 1;
        return createMockPerception(input.requestId, {
          detectedText: ["RECEPTION"],
          candidate: receptionCandidate,
        });
      },
    };
    const app = createApp({
      aiAdapter: ai,
      now: () => "2026-09-22T08:00:00+07:00",
      newId: idSequence([sessionId, observationId]),
    });
    await request(app).post(`/api/v2/routes/${demoGraph.id}/sessions`).send({
      mode: "NAVIGATE",
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.meetingRoom,
    });
    await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-nav-001",
      "2026-09-22T08:00:02+07:00",
    );

    const duplicate = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-nav-001",
      "2026-09-22T08:00:03+07:00",
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("INVALID_STATE");

    const stale = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-nav-stale",
      "2026-09-22T08:00:01+07:00",
    );
    expect(stale.status).toBe(409);
    expect(stale.body.error.requestId).toBe("mobile-nav-stale");
    expect(callCount).toBe(1);
  });

  it("maps provider timeout to the stable public error envelope", async () => {
    const ai = new ScriptedAiAdapter([
      new AiAdapterError("PROVIDER_TIMEOUT", "AI service timed out.", {
        retryable: true,
        requestId: "mobile-learn-timeout",
      }),
    ]);
    const draftGraph = { ...demoGraph, status: "DRAFT" as const, landmarks: [], edges: [] };
    const app = createApp({
      repository: new InMemoryProductRepository([draftGraph]),
      aiAdapter: ai,
      newId: () => sessionId,
      now: () => "2026-09-22T08:00:00+07:00",
    });
    await request(app).post(`/api/v2/routes/${draftGraph.id}/sessions`).send({ mode: "LEARN" });
    const response = await attachObservation(
      request(app).post(`/api/v2/sessions/${sessionId}/observations`),
      "mobile-learn-timeout",
      "2026-09-22T08:00:01+07:00",
    );

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      error: {
        code: "AI_TIMEOUT",
        message: "AI service timed out.",
        retryable: true,
        requestId: "mobile-learn-timeout",
      },
    });
  });

  it("supports the day-one draft, review, edge and publish workflow", async () => {
    const routeId = "00000000-0000-4000-8000-000000000001";
    const learnSessionId = "00000000-0000-4000-8000-000000000002";
    const firstObservationId = "00000000-0000-4000-8000-000000000003";
    const firstLandmarkId = "00000000-0000-4000-8000-000000000004";
    const secondObservationId = "00000000-0000-4000-8000-000000000005";
    const secondLandmarkId = "00000000-0000-4000-8000-000000000006";
    const edgeId = "00000000-0000-4000-8000-000000000007";
    const elevator = createMockPerception("ignored");
    const reception = createMockPerception("ignored", {
      detectedText: ["RECEPTION"],
      candidate: receptionCandidate,
    });
    const app = createApp({
      aiAdapter: new ScriptedAiAdapter([reception, elevator]),
      now: () => "2026-09-22T08:00:00+07:00",
      newId: idSequence([
        routeId,
        learnSessionId,
        firstObservationId,
        firstLandmarkId,
        secondObservationId,
        secondLandmarkId,
        edgeId,
      ]),
    });

    expect((await request(app).post("/api/v2/routes").send({ name: "Office Demo" })).status).toBe(
      201,
    );
    expect(
      (await request(app).post(`/api/v2/routes/${routeId}/sessions`).send({ mode: "LEARN" }))
        .status,
    ).toBe(201);

    const firstObservation = await attachObservation(
      request(app).post(`/api/v2/sessions/${learnSessionId}/observations`),
      "learn-001",
      "2026-09-22T08:00:01+07:00",
    );
    expect(firstObservation.body.candidateLandmark.transientFeatures).toBeUndefined();
    const firstLandmark = await request(app)
      .post(`/api/v2/sessions/${learnSessionId}/landmarks`)
      .send({ sourceObservationIds: [firstObservationId] });
    expect(firstLandmark.status).toBe(201);

    await attachObservation(
      request(app).post(`/api/v2/sessions/${learnSessionId}/observations`),
      "learn-002",
      "2026-09-22T08:00:02+07:00",
    );
    const secondLandmark = await request(app)
      .post(`/api/v2/sessions/${learnSessionId}/landmarks`)
      .send({ sourceObservationIds: [secondObservationId] });
    expect(secondLandmark.status).toBe(201);

    for (const [id, name, order] of [
      [firstLandmarkId, "Reception", 0],
      [secondLandmarkId, "Elevator Level 2", 1],
    ] as const) {
      const reviewed = await request(app)
        .patch(`/api/v2/routes/${routeId}/landmarks/${id}`)
        .send({ name, displayOrder: order, reviewStatus: "BUDDY_VERIFIED" });
      expect(reviewed.status).toBe(200);
    }

    const edges = await request(app)
      .put(`/api/v2/routes/${routeId}/edges`)
      .send({
        edges: [
          {
            displayOrder: 0,
            fromLandmarkId: firstLandmarkId,
            toLandmarkId: secondLandmarkId,
            maneuver: "GO_STRAIGHT",
          },
        ],
      });
    expect(edges.status).toBe(200);

    const published = await request(app).post(`/api/v2/routes/${routeId}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("PUBLISHED");
    expect(
      published.body.landmarks.every((item: { status: string }) => item.status === "PUBLISHED"),
    ).toBe(true);
  });
});
