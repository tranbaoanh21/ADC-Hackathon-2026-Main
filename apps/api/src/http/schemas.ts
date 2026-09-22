import { z } from "zod";

import {
  landmarkStatuses,
  landmarkTypes,
  productLocales,
  relativeManeuvers,
} from "../domain/types.js";

export const uuidSchema = z.uuid();

export const createRouteRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    locale: z.string().trim().min(2).max(20).default("vi-VN"),
  })
  .strict();

export const startSessionRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("LEARN") }).strict(),
  z
    .object({
      mode: z.literal("NAVIGATE"),
      originLandmarkId: uuidSchema,
      destinationLandmarkId: uuidSchema,
      pathStrategy: z.literal("FEWEST_EDGES").default("FEWEST_EDGES"),
    })
    .strict(),
]);

export const saveLandmarkDraftRequestSchema = z
  .object({
    sourceObservationIds: z
      .array(uuidSchema)
      .min(1)
      .max(3)
      .refine((ids) => new Set(ids).size === ids.length, "Observation IDs must be unique."),
    preferredName: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const reviewLandmarkRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(300).optional(),
    type: z.enum(landmarkTypes).optional(),
    displayOrder: z.number().int().min(0),
    reviewStatus: z.enum(["AI_DRAFT", "BUDDY_VERIFIED"]),
  })
  .strict();

export const replaceRouteEdgesRequestSchema = z
  .object({
    edges: z
      .array(
        z
          .object({
            displayOrder: z.number().int().min(0),
            fromLandmarkId: uuidSchema,
            toLandmarkId: uuidSchema,
            maneuver: z.enum(relativeManeuvers),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const observationMetadataSchema = z
  .object({
    clientRequestId: z.string().trim().min(1).max(100),
    capturedAt: z.iso.datetime({ offset: true }),
    locale: z.enum(productLocales).default("vi-VN"),
  })
  .strict();

const productCandidateLandmarkSchema = z
  .object({
    proposedName: z.string().min(1).max(100),
    type: z.enum(landmarkTypes),
    visibleText: z.array(z.string().max(100)).max(10),
    stableFeatures: z.array(z.string().max(150)).max(10),
    draftDescription: z.string().min(1).max(300),
  })
  .strict();

const aiCandidateLandmarkSchema = productCandidateLandmarkSchema.extend({
  transientFeatures: z.array(z.string().max(150)).max(10).optional(),
});

export const aiPerceptionSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    requestId: z.string().min(1).max(100),
    frameQuality: z.enum(["USABLE", "BLURRY", "TOO_DARK", "OBSTRUCTED", "UNREADABLE"]),
    detectedText: z.array(z.string().max(150)).max(20),
    sceneType: z.enum([
      "RECEPTION",
      "ELEVATOR_AREA",
      "CORRIDOR",
      "ROOM_ENTRANCE",
      "OTHER",
      "UNKNOWN",
    ]),
    landmarkCandidates: z.array(aiCandidateLandmarkSchema).max(3),
    uncertaintyReasons: z.array(z.string().max(200)).max(10),
    model: z
      .object({
        provider: z.string().min(1).max(50),
        modelId: z.string().min(1).max(100),
        promptVersion: z.string().min(1).max(50),
      })
      .strict(),
    processingTimeMs: z.number().int().min(0),
  })
  .strict();

export const landmarkSummarySchema = z
  .object({
    id: uuidSchema,
    displayOrder: z.number().int().min(0),
    name: z.string(),
    type: z.enum(landmarkTypes),
  })
  .strict();

export const workplaceSummarySchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(1).max(100),
    status: z.enum(["DRAFT", "PUBLISHED", "OUTDATED"]),
    landmarkCount: z.number().int().min(0),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const workplaceSummaryListSchema = z.array(workplaceSummarySchema);

export const landmarkSchema = z
  .object({
    id: uuidSchema,
    displayOrder: z.number().int().min(0),
    name: z.string(),
    type: z.enum(landmarkTypes),
    description: z.string(),
    visibleText: z.array(z.string()),
    stableFeatures: z.array(z.string()),
    status: z.enum(landmarkStatuses),
  })
  .strict();

export const routeEdgeSchema = z
  .object({
    id: uuidSchema,
    displayOrder: z.number().int().min(0),
    fromLandmarkId: uuidSchema,
    toLandmarkId: uuidSchema,
    maneuver: z.enum(relativeManeuvers),
  })
  .strict();

export const workplaceGraphSchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    status: z.enum(["DRAFT", "PUBLISHED", "OUTDATED"]),
    landmarks: z.array(landmarkSchema),
    edges: z.array(routeEdgeSchema),
    createdAt: z.iso.datetime({ offset: true }),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const navigationPathSchema = z
  .object({
    originLandmarkId: uuidSchema,
    destinationLandmarkId: uuidSchema,
    landmarkIds: z.array(uuidSchema).min(2),
    edgeIds: z.array(uuidSchema).min(1),
  })
  .strict();

export const routeSessionSchema = z
  .object({
    id: uuidSchema,
    routeId: uuidSchema,
    mode: z.enum(["LEARN", "NAVIGATE"]),
    status: z.enum(["ACTIVE", "AWAITING_START_CONFIRMATION", "COMPLETED", "CANCELLED"]),
    currentPathIndex: z.number().int().min(0).optional(),
    originLandmarkId: uuidSchema.nullable().optional(),
    destinationLandmarkId: uuidSchema.nullable().optional(),
    expectedLandmarkId: uuidSchema.nullable().optional(),
    plannedPath: navigationPathSchema.nullable().optional(),
    startedAt: z.iso.datetime({ offset: true }),
    finishedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export const reachableDestinationsResponseSchema = z
  .object({
    routeId: uuidSchema,
    origin: landmarkSummarySchema,
    destinations: z.array(landmarkSummarySchema),
  })
  .strict();

export const observationProductResponseSchema = z
  .object({
    requestId: z.string(),
    observationId: uuidSchema,
    sessionMode: z.enum(["LEARN", "NAVIGATE"]),
    routeState: z.enum([
      "OBSERVING",
      "AWAITING_START_CONFIRMATION",
      "SEEKING_LANDMARK",
      "STOP_AND_RESCAN",
      "ROUTE_COMPLETED",
    ]),
    landmarkMatchStatus: z.enum([
      "NOT_APPLICABLE",
      "CANDIDATE",
      "MATCHED",
      "NOT_MATCHED",
      "INSUFFICIENT_EVIDENCE",
    ]),
    candidateLandmark: productCandidateLandmarkSchema.nullable(),
    expectedLandmark: landmarkSummarySchema.nullable(),
    spokenMessage: z.string().min(1).max(500),
    shouldAdvance: z.boolean(),
    retryAllowed: z.boolean(),
  })
  .strict();

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          "VALIDATION_ERROR",
          "NOT_FOUND",
          "INVALID_STATE",
          "DUPLICATE_LANDMARK",
          "INVALID_ROUTE_TOPOLOGY",
          "NO_ROUTE_AVAILABLE",
          "AI_INVALID_RESPONSE",
          "AI_PROVIDER_UNAVAILABLE",
          "AI_TIMEOUT",
          "PAYLOAD_TOO_LARGE",
        ]),
        message: z.string(),
        retryable: z.boolean(),
        requestId: z.string().optional(),
        details: z.array(z.object({ field: z.string(), issue: z.string() }).strict()).optional(),
      })
      .strict(),
  })
  .strict();

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
