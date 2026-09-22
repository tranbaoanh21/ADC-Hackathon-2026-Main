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

export const relativeManeuvers = [
  "GO_STRAIGHT",
  "TURN_LEFT",
  "TURN_RIGHT",
  "TAKE_ELEVATOR",
  "ENTER_DOOR",
  "OTHER",
] as const;

export type LandmarkType = (typeof landmarkTypes)[number];
export type RelativeManeuver = (typeof relativeManeuvers)[number];

export interface Landmark {
  readonly id: string;
  readonly displayOrder: number;
  readonly name: string;
  readonly type: LandmarkType;
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

interface ProductErrorBody {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly details?: readonly { field: string; issue: string }[];
  };
}

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ProductApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: readonly { field: string; issue: string }[] = [],
  ) {
    super(message);
    this.name = "ProductApiError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T & ProductErrorBody;
  if (!response.ok) {
    throw new ProductApiError(
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? "Không thể hoàn tất yêu cầu.",
      body.error?.details ?? [],
    );
  }
  return body;
}

export const productApi = {
  listRoutes() {
    return apiRequest<readonly WorkplaceSummary[]>("/api/v2/routes");
  },
  getRoute(routeId: string) {
    return apiRequest<WorkplaceGraph>(`/api/v2/routes/${encodeURIComponent(routeId)}`);
  },
  reviewLandmark(
    routeId: string,
    landmarkId: string,
    input: {
      name: string;
      description?: string;
      type: LandmarkType;
      displayOrder: number;
      reviewStatus: "AI_DRAFT" | "BUDDY_VERIFIED";
    },
  ) {
    return apiRequest<Landmark>(
      `/api/v2/routes/${encodeURIComponent(routeId)}/landmarks/${encodeURIComponent(landmarkId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
  replaceEdges(
    routeId: string,
    edges: readonly {
      displayOrder: number;
      fromLandmarkId: string;
      toLandmarkId: string;
      maneuver: RelativeManeuver;
    }[],
  ) {
    return apiRequest<WorkplaceGraph>(`/api/v2/routes/${encodeURIComponent(routeId)}/edges`, {
      method: "PUT",
      body: JSON.stringify({ edges }),
    });
  },
  publishRoute(routeId: string) {
    return apiRequest<WorkplaceGraph>(`/api/v2/routes/${encodeURIComponent(routeId)}/publish`, {
      method: "POST",
    });
  },
  markOutdated(routeId: string) {
    return apiRequest<WorkplaceGraph>(
      `/api/v2/routes/${encodeURIComponent(routeId)}/mark-outdated`,
      { method: "POST" },
    );
  },
};
