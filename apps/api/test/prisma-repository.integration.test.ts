import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import { createMockPerception } from "../src/ai/mock-ai-adapter.js";
import { createApp } from "../src/app.js";
import { createNavigationSession } from "../src/domain/navigation-session.js";
import type { StoredObservation } from "../src/domain/types.js";
import { demoGraph, demoLandmarkIds } from "../src/fixtures/demo-graph.js";
import {
  createPrismaProductRepository,
  type PrismaProductRepository,
} from "../src/repositories/prisma-product-repository.js";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;

describeDatabase("PrismaProductRepository", () => {
  let repository: PrismaProductRepository | undefined;

  afterAll(async () => {
    await repository?.disconnect();
  });

  it("persists the graph, session and structured observation across repository instances", async () => {
    if (!connectionString) {
      throw new Error("TEST_DATABASE_URL is required for this integration test.");
    }
    repository = createPrismaProductRepository(connectionString);
    await repository.saveGraph(demoGraph);

    const session = createNavigationSession({
      id: "00000000-0000-4000-8000-000000000101",
      graph: demoGraph,
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.restroom,
      startedAt: "2026-09-22T08:00:00+07:00",
    });
    await repository.client.routeSession.deleteMany({ where: { id: session.id } });
    await repository.saveSession(session);
    const observation: StoredObservation = {
      id: "00000000-0000-4000-8000-000000000102",
      requestId: "database-integration-001",
      sessionId: session.id,
      capturedAt: "2026-09-22T08:00:01+07:00",
      perception: createMockPerception("database-integration-001"),
      createdAt: "2026-09-22T08:00:02+07:00",
    };
    await repository.saveObservation(observation);
    await repository.disconnect();

    repository = createPrismaProductRepository(connectionString);
    expect(await repository.listGraphs()).toContainEqual({
      id: demoGraph.id,
      name: demoGraph.name,
      status: demoGraph.status,
      landmarkCount: demoGraph.landmarks.length,
      createdAt: "2026-09-21T02:00:00.000Z",
    });
    expect(await repository.getGraph(demoGraph.id)).toEqual({
      ...demoGraph,
      createdAt: "2026-09-21T02:00:00.000Z",
      publishedAt: "2026-09-21T02:30:00.000Z",
    });
    expect(await repository.getSession(session.id)).toEqual({
      ...session,
      startedAt: "2026-09-22T01:00:00.000Z",
    });
    expect(await repository.getObservations([observation.id])).toEqual([
      {
        ...observation,
        capturedAt: "2026-09-22T01:00:01.000Z",
        createdAt: "2026-09-22T01:00:02.000Z",
      },
    ]);
    expect(await repository.isRequestProcessed(session.id, observation.requestId)).toBe(true);
    expect(await repository.getLastCapturedAt(session.id)).toBe("2026-09-22T01:00:01.000Z");
  });

  it("rolls back an invalid graph write without replacing the published graph", async () => {
    if (!connectionString) {
      throw new Error("TEST_DATABASE_URL is required for this integration test.");
    }
    repository ??= createPrismaProductRepository(connectionString);
    const invalidGraph = {
      ...demoGraph,
      edges: [
        {
          ...demoGraph.edges[0],
          id: "00000000-0000-4000-8000-000000000103",
          toLandmarkId: demoLandmarkIds.reception,
        },
      ],
    };

    await expect(repository.saveGraph(invalidGraph)).rejects.toThrow();
    expect(await repository.getGraph(demoGraph.id)).toEqual({
      ...demoGraph,
      createdAt: "2026-09-21T02:00:00.000Z",
      publishedAt: "2026-09-21T02:30:00.000Z",
    });
  });

  it("serves a Product API navigation session through the PostgreSQL repository", async () => {
    if (!connectionString) {
      throw new Error("TEST_DATABASE_URL is required for this integration test.");
    }
    repository ??= createPrismaProductRepository(connectionString);
    const databaseSessionId = "00000000-0000-4000-8000-000000000104";
    await repository.client.routeSession.deleteMany({ where: { id: databaseSessionId } });
    const app = createApp({
      repository,
      newId: () => databaseSessionId,
      now: () => "2026-09-22T08:00:00+07:00",
    });

    const response = await request(app).post(`/api/v2/routes/${demoGraph.id}/sessions`).send({
      mode: "NAVIGATE",
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.restroom,
    });

    expect(response.status).toBe(201);
    expect(response.body.plannedPath.landmarkIds).toEqual([
      demoLandmarkIds.reception,
      demoLandmarkIds.elevator,
      demoLandmarkIds.restroom,
    ]);
    expect(await repository.getSession(databaseSessionId)).not.toBeNull();
  });
});
