export const landmarkStatuses = ["AI_DRAFT", "BUDDY_VERIFIED", "PUBLISHED", "OUTDATED"] as const;

export type LandmarkStatus = (typeof landmarkStatuses)[number];

export const landmarkTypes = [
  "SIGN",
  "ROOM_ENTRANCE",
  "RECEPTION",
  "CHECK_IN_GATE",
  "ELEVATOR_AREA",
  "CORRIDOR_MARKER",
  "RESTROOM",
  "MEETING_ROOM",
  "CANTEEN",
  "OTHER",
] as const;

export type LandmarkType = (typeof landmarkTypes)[number];

export const relativeManeuvers = [
  "GO_STRAIGHT",
  "TURN_LEFT",
  "TURN_RIGHT",
  "TAKE_ELEVATOR",
  "ENTER_DOOR",
  "OTHER",
] as const;

export type RelativeManeuver = (typeof relativeManeuvers)[number];

export const productLocales = ["en-US", "vi-VN"] as const;

export type ProductLocale = (typeof productLocales)[number];

export interface Landmark {
  readonly id: string;
  readonly displayOrder: number;
  readonly name: string;
  readonly type: LandmarkType;
  readonly description: string;
  readonly visibleText: readonly string[];
  readonly stableFeatures: readonly string[];
  readonly status: LandmarkStatus;
}

export interface RouteEdge {
  readonly id: string;
  readonly displayOrder: number;
  readonly fromLandmarkId: string;
  readonly toLandmarkId: string;
  readonly maneuver: RelativeManeuver;
}

export interface WorkplaceGraph {
  readonly id: string;
  readonly name: string;
  readonly status: "DRAFT" | "PUBLISHED" | "OUTDATED";
  readonly landmarks: readonly Landmark[];
  readonly edges: readonly RouteEdge[];
  readonly createdAt: string;
  readonly publishedAt: string | null;
}

export interface WorkplaceSummary {
  readonly id: string;
  readonly name: string;
  readonly status: WorkplaceGraph["status"];
  readonly landmarkCount: number;
  readonly createdAt: string;
}

export interface LandmarkSummary {
  readonly id: string;
  readonly displayOrder: number;
  readonly name: string;
  readonly type: LandmarkType;
}

export interface NavigationPath {
  readonly originLandmarkId: string;
  readonly destinationLandmarkId: string;
  readonly landmarkIds: readonly string[];
  readonly edgeIds: readonly string[];
}

export type RouteSessionStatus =
  | "ACTIVE"
  | "AWAITING_START_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLED";

export interface NavigationSession {
  readonly id: string;
  readonly routeId: string;
  readonly mode: "NAVIGATE";
  readonly status: RouteSessionStatus;
  readonly currentPathIndex: number;
  readonly originLandmarkId: string;
  readonly destinationLandmarkId: string;
  readonly expectedLandmarkId: string | null;
  readonly plannedPath: NavigationPath;
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export interface LearnSession {
  readonly id: string;
  readonly routeId: string;
  readonly mode: "LEARN";
  readonly status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export type ProductSession = NavigationSession | LearnSession;

export type FrameQuality = "USABLE" | "BLURRY" | "TOO_DARK" | "OBSTRUCTED" | "UNREADABLE";

export interface PerceptionEvidence {
  readonly frameQuality: FrameQuality;
  readonly detectedText: readonly string[];
  readonly candidateVisibleText?: readonly string[];
}

export interface CandidateLandmark {
  readonly proposedName: string;
  readonly type: LandmarkType;
  readonly visibleText: readonly string[];
  readonly stableFeatures: readonly string[];
  readonly draftDescription: string;
  readonly transientFeatures?: readonly string[];
}

export interface AiPerception {
  readonly schemaVersion: "1.0";
  readonly requestId: string;
  readonly frameQuality: FrameQuality;
  readonly detectedText: readonly string[];
  readonly sceneType:
    | "RECEPTION"
    | "ELEVATOR_AREA"
    | "CORRIDOR"
    | "ROOM_ENTRANCE"
    | "OTHER"
    | "UNKNOWN";
  readonly landmarkCandidates: readonly CandidateLandmark[];
  readonly uncertaintyReasons: readonly string[];
  readonly model: {
    readonly provider: string;
    readonly modelId: string;
    readonly promptVersion: string;
  };
  readonly processingTimeMs: number;
}

export interface StoredObservation {
  readonly id: string;
  readonly requestId: string;
  readonly sessionId: string;
  readonly capturedAt: string;
  readonly perception: AiPerception;
  readonly createdAt: string;
}

export type LandmarkMatchStatus = "MATCHED" | "NOT_MATCHED" | "INSUFFICIENT_EVIDENCE";

export interface NavigationTransition {
  readonly session: NavigationSession;
  readonly routeState:
    | "AWAITING_START_CONFIRMATION"
    | "SEEKING_LANDMARK"
    | "STOP_AND_RESCAN"
    | "ROUTE_COMPLETED";
  readonly landmarkMatchStatus: LandmarkMatchStatus;
  readonly expectedLandmark: LandmarkSummary | null;
  readonly spokenMessage: string;
  readonly shouldAdvance: boolean;
}

export type ProductErrorCode =
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "INVALID_ROUTE_TOPOLOGY"
  | "NO_ROUTE_AVAILABLE";

export class ProductDomainError extends Error {
  readonly code: ProductErrorCode;

  constructor(code: ProductErrorCode, message: string) {
    super(message);
    this.name = "ProductDomainError";
    this.code = code;
  }
}

export function toLandmarkSummary(landmark: Landmark): LandmarkSummary {
  return {
    id: landmark.id,
    displayOrder: landmark.displayOrder,
    name: landmark.name,
    type: landmark.type,
  };
}
