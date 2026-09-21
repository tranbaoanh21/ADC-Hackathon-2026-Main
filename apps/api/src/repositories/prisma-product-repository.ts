import { PrismaPg } from "@prisma/adapter-pg";

import type {
  NavigationPath,
  NavigationSession,
  ProductSession,
  StoredObservation,
  WorkplaceGraph,
} from "../domain/types.js";
import { Prisma, PrismaClient, type RouteSession } from "../generated/prisma/client.js";
import { aiPerceptionSchema, navigationPathSchema } from "../http/schemas.js";
import type { ProductRepository } from "./product-repository.js";

const graphInclude = {
  landmarks: { include: { landmark: true } },
  edges: true,
} satisfies Prisma.RouteInclude;

type StoredGraph = Prisma.RouteGetPayload<{ include: typeof graphInclude }>;

function toIso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapGraph(record: StoredGraph): WorkplaceGraph {
  return {
    id: record.id,
    name: record.name,
    status: record.status,
    landmarks: record.landmarks
      .map((membership) => ({
        id: membership.landmark.id,
        displayOrder: membership.displayOrder,
        name: membership.landmark.name,
        type: membership.landmark.type,
        description: membership.landmark.description,
        visibleText: membership.landmark.visibleText,
        stableFeatures: membership.landmark.stableFeatures,
        status: membership.status,
      }))
      .sort(
        (left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
      ),
    edges: record.edges
      .map((edge) => ({
        id: edge.id,
        displayOrder: edge.displayOrder,
        fromLandmarkId: edge.fromLandmarkId,
        toLandmarkId: edge.toLandmarkId,
        maneuver: edge.maneuver,
        spokenCue: edge.spokenCue,
      }))
      .sort(
        (left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
      ),
    createdAt: record.createdAt.toISOString(),
    publishedAt: toIso(record.publishedAt),
  };
}

function mapSession(record: RouteSession): ProductSession {
  const base = {
    id: record.id,
    routeId: record.routeId,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    finishedAt: toIso(record.finishedAt),
  };

  if (record.mode === "LEARN") {
    if (record.status === "AWAITING_START_CONFIRMATION") {
      throw new Error("Stored learn session has an invalid status.");
    }
    return { ...base, mode: "LEARN", status: record.status };
  }

  if (
    record.currentPathIndex === null ||
    record.originLandmarkId === null ||
    record.destinationLandmarkId === null ||
    record.plannedPath === null
  ) {
    throw new Error("Stored navigation session is incomplete.");
  }

  return {
    ...base,
    mode: "NAVIGATE",
    currentPathIndex: record.currentPathIndex,
    originLandmarkId: record.originLandmarkId,
    destinationLandmarkId: record.destinationLandmarkId,
    expectedLandmarkId: record.expectedLandmarkId,
    plannedPath: navigationPathSchema.parse(record.plannedPath) as NavigationPath,
  } satisfies NavigationSession;
}

export class PrismaProductRepository implements ProductRepository {
  constructor(readonly client: PrismaClient) {}

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async getGraph(routeId: string): Promise<WorkplaceGraph | null> {
    const record = await this.client.route.findUnique({
      where: { id: routeId },
      include: graphInclude,
    });
    return record ? mapGraph(record) : null;
  }

  async saveGraph(graph: WorkplaceGraph): Promise<WorkplaceGraph> {
    await this.client.$transaction(async (transaction) => {
      const previousMemberships = await transaction.routeLandmark.findMany({
        where: { routeId: graph.id },
        select: { landmarkId: true, status: true },
      });
      const previousStatus = new Map(
        previousMemberships.map((item) => [item.landmarkId, item.status]),
      );

      await transaction.route.upsert({
        where: { id: graph.id },
        create: {
          id: graph.id,
          name: graph.name,
          status: graph.status,
          createdAt: new Date(graph.createdAt),
          publishedAt: graph.publishedAt ? new Date(graph.publishedAt) : null,
        },
        update: {
          name: graph.name,
          status: graph.status,
          publishedAt: graph.publishedAt ? new Date(graph.publishedAt) : null,
        },
      });

      await transaction.routeEdge.deleteMany({ where: { routeId: graph.id } });

      for (const landmark of graph.landmarks) {
        await transaction.landmark.upsert({
          where: { id: landmark.id },
          create: {
            id: landmark.id,
            name: landmark.name,
            type: landmark.type,
            description: landmark.description,
            visibleText: [...landmark.visibleText],
            stableFeatures: [...landmark.stableFeatures],
          },
          update: {
            name: landmark.name,
            type: landmark.type,
            description: landmark.description,
            visibleText: [...landmark.visibleText],
            stableFeatures: [...landmark.stableFeatures],
          },
        });
        await transaction.routeLandmark.upsert({
          where: { routeId_landmarkId: { routeId: graph.id, landmarkId: landmark.id } },
          create: {
            routeId: graph.id,
            landmarkId: landmark.id,
            displayOrder: landmark.displayOrder,
            status: landmark.status,
          },
          update: { displayOrder: landmark.displayOrder, status: landmark.status },
        });

        if (previousStatus.get(landmark.id) !== landmark.status) {
          await transaction.landmarkReview.create({
            data: {
              routeId: graph.id,
              landmarkId: landmark.id,
              status: landmark.status,
              reviewerRole: landmark.status === "BUDDY_VERIFIED" ? "BUDDY" : "SYSTEM",
            },
          });
        }
      }

      if (graph.landmarks.length === 0) {
        await transaction.routeLandmark.deleteMany({ where: { routeId: graph.id } });
      } else {
        await transaction.routeLandmark.deleteMany({
          where: {
            routeId: graph.id,
            landmarkId: { notIn: graph.landmarks.map((landmark) => landmark.id) },
          },
        });
      }

      if (graph.edges.length > 0) {
        await transaction.routeEdge.createMany({
          data: graph.edges.map((edge) => ({
            id: edge.id,
            routeId: graph.id,
            displayOrder: edge.displayOrder,
            fromLandmarkId: edge.fromLandmarkId,
            toLandmarkId: edge.toLandmarkId,
            maneuver: edge.maneuver,
            spokenCue: edge.spokenCue,
          })),
        });
      }
    });

    const saved = await this.getGraph(graph.id);
    if (!saved) {
      throw new Error("Graph disappeared after the persistence transaction.");
    }
    return saved;
  }

  async getSession(sessionId: string): Promise<ProductSession | null> {
    const record = await this.client.routeSession.findUnique({ where: { id: sessionId } });
    return record ? mapSession(record) : null;
  }

  async saveSession(session: ProductSession): Promise<ProductSession> {
    const navigation = session.mode === "NAVIGATE" ? session : null;
    const record = await this.client.routeSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        routeId: session.routeId,
        mode: session.mode,
        status: session.status,
        currentPathIndex: navigation?.currentPathIndex ?? null,
        originLandmarkId: navigation?.originLandmarkId ?? null,
        destinationLandmarkId: navigation?.destinationLandmarkId ?? null,
        expectedLandmarkId: navigation?.expectedLandmarkId ?? null,
        plannedPath: navigation ? toJsonInput(navigation.plannedPath) : Prisma.DbNull,
        startedAt: new Date(session.startedAt),
        finishedAt: session.finishedAt ? new Date(session.finishedAt) : null,
      },
      update: {
        status: session.status,
        currentPathIndex: navigation?.currentPathIndex ?? null,
        expectedLandmarkId: navigation?.expectedLandmarkId ?? null,
        plannedPath: navigation ? toJsonInput(navigation.plannedPath) : Prisma.DbNull,
        finishedAt: session.finishedAt ? new Date(session.finishedAt) : null,
      },
    });
    return mapSession(record);
  }

  async getObservations(observationIds: readonly string[]): Promise<readonly StoredObservation[]> {
    const records = await this.client.observation.findMany({
      where: { id: { in: [...observationIds] } },
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    return observationIds.flatMap((id) => {
      const record = byId.get(id);
      return record
        ? [
            {
              id: record.id,
              requestId: record.requestId,
              sessionId: record.sessionId,
              capturedAt: record.capturedAt.toISOString(),
              perception: aiPerceptionSchema.parse(record.perception),
              createdAt: record.createdAt.toISOString(),
            },
          ]
        : [];
    });
  }

  async saveObservation(observation: StoredObservation): Promise<StoredObservation> {
    const record = await this.client.observation.create({
      data: {
        id: observation.id,
        requestId: observation.requestId,
        sessionId: observation.sessionId,
        capturedAt: new Date(observation.capturedAt),
        perception: toJsonInput(observation.perception),
        createdAt: new Date(observation.createdAt),
      },
    });
    return {
      id: record.id,
      requestId: record.requestId,
      sessionId: record.sessionId,
      capturedAt: record.capturedAt.toISOString(),
      perception: aiPerceptionSchema.parse(record.perception),
      createdAt: record.createdAt.toISOString(),
    };
  }

  async isRequestProcessed(sessionId: string, requestId: string): Promise<boolean> {
    return (await this.client.observation.count({ where: { sessionId, requestId }, take: 1 })) > 0;
  }

  async getLastCapturedAt(sessionId: string): Promise<string | null> {
    const latest = await this.client.observation.findFirst({
      where: { sessionId },
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });
    return latest?.capturedAt.toISOString() ?? null;
  }

  async markRequestProcessed(): Promise<void> {
    // Persisting Observation atomically records the request ID and capturedAt.
  }
}

export function createPrismaProductRepository(connectionString: string): PrismaProductRepository {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaProductRepository(new PrismaClient({ adapter }));
}
