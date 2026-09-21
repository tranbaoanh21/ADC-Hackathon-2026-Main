export type LandmarkType =
  | "SIGN"
  | "ROOM_ENTRANCE"
  | "RECEPTION"
  | "CHECK_IN_GATE"
  | "ELEVATOR_AREA"
  | "CORRIDOR_MARKER"
  | "RESTROOM"
  | "MEETING_ROOM"
  | "CANTEEN"
  | "OTHER";

export interface LandmarkSummary {
  readonly id: string;
  readonly displayOrder: number;
  readonly name: string;
  readonly type: LandmarkType;
}

export interface Landmark extends LandmarkSummary {
  readonly description: string;
  readonly visibleText: readonly string[];
  readonly stableFeatures: readonly string[];
  readonly status: "AI_DRAFT" | "BUDDY_VERIFIED" | "PUBLISHED" | "OUTDATED";
}

export interface RouteEdge {
  readonly id: string;
  readonly displayOrder: number;
  readonly fromLandmarkId: string;
  readonly toLandmarkId: string;
  readonly maneuver:
    | "GO_STRAIGHT"
    | "TURN_LEFT"
    | "TURN_RIGHT"
    | "TAKE_ELEVATOR"
    | "ENTER_DOOR"
    | "OTHER";
  readonly spokenCue: string;
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

export interface NavigationPath {
  readonly originLandmarkId: string;
  readonly destinationLandmarkId: string;
  readonly landmarkIds: readonly string[];
  readonly edgeIds: readonly string[];
}

export interface RouteSession {
  readonly id: string;
  readonly routeId: string;
  readonly mode: "LEARN" | "NAVIGATE";
  readonly status: "ACTIVE" | "AWAITING_START_CONFIRMATION" | "COMPLETED" | "CANCELLED";
  readonly currentPathIndex?: number;
  readonly originLandmarkId?: string | null;
  readonly destinationLandmarkId?: string | null;
  readonly expectedLandmarkId?: string | null;
  readonly plannedPath?: NavigationPath | null;
  readonly startedAt: string;
  readonly finishedAt?: string | null;
}

export interface CandidateLandmark {
  readonly proposedName: string;
  readonly type: LandmarkType;
  readonly visibleText: readonly string[];
  readonly stableFeatures: readonly string[];
  readonly draftDescription: string;
}

export interface ObservationResponse {
  readonly requestId: string;
  readonly observationId: string;
  readonly sessionMode: "LEARN" | "NAVIGATE";
  readonly routeState:
    | "OBSERVING"
    | "AWAITING_START_CONFIRMATION"
    | "SEEKING_LANDMARK"
    | "STOP_AND_RESCAN"
    | "ROUTE_COMPLETED";
  readonly landmarkMatchStatus:
    | "NOT_APPLICABLE"
    | "CANDIDATE"
    | "MATCHED"
    | "NOT_MATCHED"
    | "INSUFFICIENT_EVIDENCE";
  readonly candidateLandmark: CandidateLandmark | null;
  readonly expectedLandmark: LandmarkSummary | null;
  readonly spokenMessage: string;
  readonly shouldAdvance: boolean;
  readonly retryAllowed: boolean;
}

export interface ReachableDestinations {
  readonly routeId: string;
  readonly origin: LandmarkSummary;
  readonly destinations: readonly LandmarkSummary[];
}

export interface ProductErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly retryable?: boolean;
  };
}
