import { randomUUID } from "node:crypto";

import { Router } from "express";
import multer from "multer";

import type { AiAdapter } from "../ai/ai-adapter.js";
import { getGraphLandmark, listReachableDestinations, validateGraph } from "../domain/graph.js";
import { matchExpectedLandmark, normalizeLandmarkText } from "../domain/landmark-match.js";
import { learnNarration } from "../domain/navigation-copy.js";
import {
  createNavigationSession,
  transitionNavigationSession,
} from "../domain/navigation-session.js";
import {
  type CandidateLandmark,
  type Landmark,
  type LearnSession,
  type ProductSession,
  type RouteEdge,
  type StoredObservation,
  toLandmarkSummary,
  type WorkplaceGraph,
} from "../domain/types.js";
import type { ProductRepository } from "../repositories/product-repository.js";
import { HttpError, notFoundError } from "./errors.js";
import {
  aiPerceptionSchema,
  createRouteRequestSchema,
  landmarkSchema,
  observationMetadataSchema,
  observationProductResponseSchema,
  reachableDestinationsResponseSchema,
  replaceRouteEdgesRequestSchema,
  reviewLandmarkRequestSchema,
  routeSessionSchema,
  saveLandmarkDraftRequestSchema,
  startSessionRequestSchema,
  uuidSchema,
  workplaceGraphSchema,
  workplaceSummaryListSchema,
} from "./schemas.js";

const uploadFrames = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 3, fields: 3 },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      callback(new HttpError(422, "VALIDATION_ERROR", "Frames must be JPEG or PNG images."));
      return;
    }
    callback(null, true);
  },
});

export interface ProductRouterDependencies {
  readonly repository: ProductRepository;
  readonly aiAdapter: AiAdapter;
  readonly now?: () => string;
  readonly newId?: () => string;
}

function parseId(value: string | string[] | undefined): string {
  return uuidSchema.parse(value);
}

function parseBody<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  return schema.parse(value);
}

function assertDraftGraph(graph: WorkplaceGraph): void {
  if (graph.status !== "DRAFT") {
    throw new HttpError(409, "INVALID_STATE", "Only a draft graph can be edited.");
  }
}

async function requireGraph(
  repository: ProductRepository,
  routeId: string,
): Promise<WorkplaceGraph> {
  const graph = await repository.getGraph(routeId);
  if (!graph) {
    throw notFoundError("Route");
  }
  return graph;
}

async function requireSession(
  repository: ProductRepository,
  sessionId: string,
): Promise<ProductSession> {
  const session = await repository.getSession(sessionId);
  if (!session) {
    throw notFoundError("Session");
  }
  return session;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toProductCandidate(candidate: CandidateLandmark): CandidateLandmark {
  return {
    proposedName: candidate.proposedName,
    type: candidate.type,
    visibleText: [...candidate.visibleText],
    stableFeatures: [...candidate.stableFeatures],
    draftDescription: candidate.draftDescription,
  };
}

export function createProductRouter(dependencies: ProductRouterDependencies): Router {
  const router = Router();
  const { repository, aiAdapter } = dependencies;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const newId = dependencies.newId ?? randomUUID;

  router.get("/routes", async (_request, response) => {
    const graphs = await repository.listGraphs();
    response.json(workplaceSummaryListSchema.parse(graphs));
  });

  router.post("/routes", async (request, response) => {
    const input = parseBody(createRouteRequestSchema, request.body);
    const graph: WorkplaceGraph = {
      id: newId(),
      name: input.name,
      status: "DRAFT",
      landmarks: [],
      edges: [],
      createdAt: now(),
      publishedAt: null,
    };

    await repository.saveGraph(graph);
    response.status(201).json(workplaceGraphSchema.parse(graph));
  });

  router.get("/routes/:routeId", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    response.json(workplaceGraphSchema.parse(graph));
  });

  router.get("/routes/:routeId/reachable-destinations", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    const originLandmarkId = parseId(
      typeof request.query.originLandmarkId === "string"
        ? request.query.originLandmarkId
        : undefined,
    );
    const origin = getGraphLandmark(graph, originLandmarkId);
    const body = {
      routeId: graph.id,
      origin: toLandmarkSummary(origin),
      destinations: listReachableDestinations(graph, originLandmarkId),
    };
    response.json(reachableDestinationsResponseSchema.parse(body));
  });

  router.post("/routes/:routeId/sessions", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    const input = parseBody(startSessionRequestSchema, request.body);
    const startedAt = now();
    let session: ProductSession;

    if (input.mode === "LEARN") {
      if (graph.status !== "DRAFT") {
        throw new HttpError(409, "INVALID_STATE", "Learning requires a draft graph.");
      }
      session = {
        id: newId(),
        routeId: graph.id,
        mode: "LEARN",
        status: "ACTIVE",
        startedAt,
        finishedAt: null,
      };
    } else {
      session = createNavigationSession({
        id: newId(),
        graph,
        originLandmarkId: input.originLandmarkId,
        destinationLandmarkId: input.destinationLandmarkId,
        startedAt,
      });
    }

    await repository.saveSession(session);
    response.status(201).json(routeSessionSchema.parse(session));
  });

  router.post(
    "/sessions/:sessionId/observations",
    uploadFrames.array("frames", 3),
    async (request, response) => {
      const sessionId = parseId(request.params.sessionId);
      const session = await requireSession(repository, sessionId);
      if (session.status === "COMPLETED" || session.status === "CANCELLED") {
        throw new HttpError(409, "INVALID_STATE", "The session is not active.");
      }

      const metadata = observationMetadataSchema.parse({
        clientRequestId: request.body.clientRequestId,
        capturedAt: request.body.capturedAt,
        locale: request.body.locale,
      });
      const files = request.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw new HttpError(422, "VALIDATION_ERROR", "At least one frame is required.", {
          details: [{ field: "frames", issue: "Upload between one and three frames." }],
        });
      }

      if (await repository.isRequestProcessed(sessionId, metadata.clientRequestId)) {
        throw new HttpError(
          409,
          "INVALID_STATE",
          "This observation request was already processed.",
          {
            requestId: metadata.clientRequestId,
          },
        );
      }
      const lastCapturedAt = await repository.getLastCapturedAt(sessionId);
      if (lastCapturedAt && Date.parse(metadata.capturedAt) <= Date.parse(lastCapturedAt)) {
        throw new HttpError(409, "INVALID_STATE", "The observation is older than session state.", {
          requestId: metadata.clientRequestId,
        });
      }

      const rawPerception = await aiAdapter.analyseFrames({
        requestId: metadata.clientRequestId,
        locale: metadata.locale,
        analysisMode: session.mode === "LEARN" ? "LANDMARK_DISCOVERY" : "LANDMARK_OBSERVATION",
        frames: files.map((file) => ({ bytes: file.buffer, contentType: file.mimetype })),
      });
      const parsedPerception = aiPerceptionSchema.safeParse(rawPerception);
      if (!parsedPerception.success) {
        throw new HttpError(503, "AI_INVALID_RESPONSE", "AI returned an invalid response.", {
          retryable: true,
          requestId: metadata.clientRequestId,
        });
      }
      const perception = parsedPerception.data;
      if (perception.requestId !== metadata.clientRequestId) {
        throw new HttpError(503, "AI_INVALID_RESPONSE", "AI response request ID did not match.", {
          retryable: true,
          requestId: metadata.clientRequestId,
        });
      }

      const observation: StoredObservation = {
        id: newId(),
        requestId: metadata.clientRequestId,
        sessionId,
        capturedAt: metadata.capturedAt,
        perception,
        createdAt: now(),
      };

      let productResponse: unknown;
      if (session.mode === "LEARN") {
        const candidate = perception.landmarkCandidates[0]
          ? toProductCandidate(perception.landmarkCandidates[0])
          : null;
        productResponse = {
          requestId: metadata.clientRequestId,
          observationId: observation.id,
          sessionMode: "LEARN",
          routeState: "OBSERVING",
          landmarkMatchStatus: candidate ? "CANDIDATE" : "INSUFFICIENT_EVIDENCE",
          candidateLandmark: candidate,
          expectedLandmark: null,
          spokenMessage: learnNarration(candidate?.proposedName ?? null, metadata.locale),
          shouldAdvance: false,
          retryAllowed: true,
        };
      } else {
        const graph = await requireGraph(repository, session.routeId);
        if (!session.expectedLandmarkId) {
          throw new HttpError(409, "INVALID_STATE", "No expected landmark remains.");
        }
        const expected = getGraphLandmark(graph, session.expectedLandmarkId);
        const matchStatus = matchExpectedLandmark(
          {
            frameQuality: perception.frameQuality,
            detectedText: perception.detectedText,
            candidateVisibleText: perception.landmarkCandidates[0]?.visibleText,
          },
          expected,
        );
        const transition = transitionNavigationSession(
          session,
          graph,
          matchStatus,
          metadata.capturedAt,
          metadata.locale,
        );
        await repository.saveSession(transition.session);
        productResponse = {
          requestId: metadata.clientRequestId,
          observationId: observation.id,
          sessionMode: "NAVIGATE",
          routeState: transition.routeState,
          landmarkMatchStatus: transition.landmarkMatchStatus,
          candidateLandmark: null,
          expectedLandmark: transition.expectedLandmark,
          spokenMessage: transition.spokenMessage,
          shouldAdvance: transition.shouldAdvance,
          retryAllowed: transition.routeState !== "ROUTE_COMPLETED",
        };
      }

      await repository.saveObservation(observation);
      await repository.markRequestProcessed(
        sessionId,
        metadata.clientRequestId,
        metadata.capturedAt,
      );
      response.json(observationProductResponseSchema.parse(productResponse));
    },
  );

  router.post("/sessions/:sessionId/landmarks", async (request, response) => {
    const sessionId = parseId(request.params.sessionId);
    const session = await requireSession(repository, sessionId);
    if (session.mode !== "LEARN" || session.status !== "ACTIVE") {
      throw new HttpError(409, "INVALID_STATE", "An active learn session is required.");
    }
    const input = parseBody(saveLandmarkDraftRequestSchema, request.body);
    const observations = await repository.getObservations(input.sourceObservationIds);
    if (
      observations.length !== input.sourceObservationIds.length ||
      observations.some((observation) => observation.sessionId !== sessionId)
    ) {
      throw new HttpError(409, "INVALID_STATE", "Observation evidence is missing or unrelated.");
    }

    const candidates = observations.flatMap((observation) =>
      observation.perception.landmarkCandidates.slice(0, 1),
    );
    const first = candidates[0];
    if (!first) {
      throw new HttpError(409, "INVALID_STATE", "Observation evidence has no landmark candidate.");
    }

    const graph = await requireGraph(repository, session.routeId);
    assertDraftGraph(graph);
    const visibleText = unique(candidates.flatMap((candidate) => candidate.visibleText));
    const stableFeatures = unique(candidates.flatMap((candidate) => candidate.stableFeatures));
    const normalizedCandidateText = new Set(visibleText.map(normalizeLandmarkText));
    const duplicate = graph.landmarks.some(
      (landmark) =>
        landmark.type === first.type &&
        landmark.visibleText.some((text) =>
          normalizedCandidateText.has(normalizeLandmarkText(text)),
        ),
    );
    if (duplicate) {
      throw new HttpError(
        409,
        "DUPLICATE_LANDMARK",
        "A landmark with the same stable text exists.",
      );
    }

    const landmark: Landmark = {
      id: newId(),
      displayOrder:
        graph.landmarks.reduce((maximum, item) => Math.max(maximum, item.displayOrder), -1) + 1,
      name: input.preferredName ?? first.proposedName,
      type: first.type,
      description: first.draftDescription,
      visibleText,
      stableFeatures,
      status: "AI_DRAFT",
    };
    await repository.saveGraph({ ...graph, landmarks: [...graph.landmarks, landmark] });
    response.status(201).json(landmarkSchema.parse(landmark));
  });

  router.post("/sessions/:sessionId/finish", async (request, response) => {
    const session = await requireSession(repository, parseId(request.params.sessionId));
    let finished: ProductSession;
    if (session.mode === "LEARN" && session.status === "ACTIVE") {
      finished = { ...session, status: "COMPLETED", finishedAt: now() } satisfies LearnSession;
    } else if (session.mode === "NAVIGATE" && session.status === "COMPLETED") {
      finished = session;
    } else {
      throw new HttpError(409, "INVALID_STATE", "The session cannot be finished now.");
    }
    await repository.saveSession(finished);
    response.json(routeSessionSchema.parse(finished));
  });

  router.patch("/routes/:routeId/landmarks/:landmarkId", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    assertDraftGraph(graph);
    const landmarkId = parseId(request.params.landmarkId);
    const existing = graph.landmarks.find((landmark) => landmark.id === landmarkId);
    if (!existing) {
      throw notFoundError("Landmark");
    }
    const input = parseBody(reviewLandmarkRequestSchema, request.body);
    const updated: Landmark = {
      ...existing,
      name: input.name,
      description: input.description ?? existing.description,
      type: input.type ?? existing.type,
      displayOrder: input.displayOrder,
      status: input.reviewStatus,
    };
    await repository.saveGraph({
      ...graph,
      landmarks: graph.landmarks.map((landmark) =>
        landmark.id === landmarkId ? updated : landmark,
      ),
    });
    response.json(landmarkSchema.parse(updated));
  });

  router.put("/routes/:routeId/edges", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    assertDraftGraph(graph);
    const input = parseBody(replaceRouteEdgesRequestSchema, request.body);
    const edges: RouteEdge[] = input.edges.map((edge) => ({ id: newId(), ...edge }));
    const updated: WorkplaceGraph = { ...graph, edges };
    const issues = validateGraph(updated);
    if (issues.length > 0) {
      throw new HttpError(409, "INVALID_ROUTE_TOPOLOGY", "Route edges are invalid.", {
        details: issues,
      });
    }
    await repository.saveGraph(updated);
    response.json(workplaceGraphSchema.parse(updated));
  });

  router.post("/routes/:routeId/publish", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    assertDraftGraph(graph);
    if (graph.landmarks.length < 2 || graph.edges.length < 1) {
      throw new HttpError(
        409,
        "INVALID_ROUTE_TOPOLOGY",
        "Publishing requires at least two landmarks and one directed edge.",
      );
    }
    if (graph.landmarks.some((landmark) => landmark.status !== "BUDDY_VERIFIED")) {
      throw new HttpError(409, "INVALID_STATE", "Every landmark requires buddy verification.");
    }
    const issues = validateGraph(graph);
    if (issues.length > 0) {
      throw new HttpError(409, "INVALID_ROUTE_TOPOLOGY", "Route topology is invalid.", {
        details: issues,
      });
    }
    const incidentLandmarkIds = new Set(
      graph.edges.flatMap((edge) => [edge.fromLandmarkId, edge.toLandmarkId]),
    );
    if (graph.landmarks.some((landmark) => !incidentLandmarkIds.has(landmark.id))) {
      throw new HttpError(409, "INVALID_ROUTE_TOPOLOGY", "Every landmark must join an edge.");
    }
    const publishedAt = now();
    const published: WorkplaceGraph = {
      ...graph,
      status: "PUBLISHED",
      publishedAt,
      landmarks: graph.landmarks.map((landmark) => ({ ...landmark, status: "PUBLISHED" })),
    };
    await repository.saveGraph(published);
    response.json(workplaceGraphSchema.parse(published));
  });

  router.post("/routes/:routeId/mark-outdated", async (request, response) => {
    const graph = await requireGraph(repository, parseId(request.params.routeId));
    const outdated: WorkplaceGraph = {
      ...graph,
      status: "OUTDATED",
      landmarks: graph.landmarks.map((landmark) => ({ ...landmark, status: "OUTDATED" })),
    };
    await repository.saveGraph(outdated);
    response.json(workplaceGraphSchema.parse(outdated));
  });

  return router;
}
