import { File } from "expo-file-system";

import type {
  Landmark,
  ObservationResponse,
  ProductErrorBody,
  ReachableDestinations,
  RouteSession,
  WorkplaceGraph,
  WorkplaceSummary,
} from "./types";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || "http://localhost:3000").replace(/\/$/, "");
// Keep the client deadline longer than Express (35s) and FastAPI/Gemini (30s)
// so the user receives the backend's structured error instead of a misleading
// mobile network failure while a valid perception request is still running.
const REQUEST_TIMEOUT_MS = 40_000;

export class ProductApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code = "NETWORK_ERROR", retryable = true) {
    super(message);
    this.name = "ProductApiError";
    this.code = code;
    this.retryable = retryable;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as T | ProductErrorBody | null;
    if (!response.ok) {
      const errorBody = body as ProductErrorBody | null;
      throw new ProductApiError(
        errorBody?.error?.message ?? `Yêu cầu thất bại với mã ${response.status}.`,
        errorBody?.error?.code ?? "HTTP_ERROR",
        errorBody?.error?.retryable ?? response.status >= 500,
      );
    }
    if (body === null) {
      throw new ProductApiError("Máy chủ trả về dữ liệu trống.", "INVALID_RESPONSE", true);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ProductApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProductApiError("Quá thời gian chờ. Hãy thử quét lại.", "TIMEOUT", true);
    }
    throw new ProductApiError("Không thể kết nối với PathMemory API.", "NETWORK_ERROR", true);
  } finally {
    clearTimeout(timeout);
  }
}

export function createRoute(name: string, language: "en" | "vi"): Promise<WorkplaceGraph> {
  return request("/api/v2/routes", {
    method: "POST",
    body: JSON.stringify({ name, locale: language === "en" ? "en-US" : "vi-VN" }),
  });
}

export function getRoute(routeId: string): Promise<WorkplaceGraph> {
  return request(`/api/v2/routes/${encodeURIComponent(routeId)}`);
}

export function listRoutes(): Promise<readonly WorkplaceSummary[]> {
  return request("/api/v2/routes");
}

export function getReachableDestinations(
  routeId: string,
  originLandmarkId: string,
): Promise<ReachableDestinations> {
  const query = new URLSearchParams({ originLandmarkId });
  return request(`/api/v2/routes/${encodeURIComponent(routeId)}/reachable-destinations?${query}`);
}

export function startLearnSession(routeId: string): Promise<RouteSession> {
  return request(`/api/v2/routes/${encodeURIComponent(routeId)}/sessions`, {
    method: "POST",
    body: JSON.stringify({ mode: "LEARN" }),
  });
}

export function startNavigateSession(
  routeId: string,
  originLandmarkId: string,
  destinationLandmarkId: string,
): Promise<RouteSession> {
  return request(`/api/v2/routes/${encodeURIComponent(routeId)}/sessions`, {
    method: "POST",
    body: JSON.stringify({
      mode: "NAVIGATE",
      originLandmarkId,
      destinationLandmarkId,
      pathStrategy: "FEWEST_EDGES",
    }),
  });
}

export async function observeFrame(
  sessionId: string,
  imageUri: string,
  clientRequestId: string,
  language: "en" | "vi",
): Promise<ObservationResponse> {
  const frame = new File(imageUri);
  const form = new FormData();
  form.append("clientRequestId", clientRequestId);
  form.append("capturedAt", new Date().toISOString());
  form.append("locale", language === "en" ? "en-US" : "vi-VN");
  form.append("frames", frame, frame.name || "pathmemory-frame.jpg");

  try {
    return await request(`/api/v2/sessions/${encodeURIComponent(sessionId)}/observations`, {
      method: "POST",
      body: form,
    });
  } finally {
    // Camera output is temporary evidence. It is removed after upload and is never retained by the app.
    try {
      frame.delete();
    } catch {
      // The OS may already have reclaimed a temporary camera file.
    }
  }
}

export function saveLandmarkDraft(
  sessionId: string,
  observationId: string,
  preferredName: string,
): Promise<Landmark> {
  return request(`/api/v2/sessions/${encodeURIComponent(sessionId)}/landmarks`, {
    method: "POST",
    body: JSON.stringify({
      sourceObservationIds: [observationId],
      preferredName,
    }),
  });
}

export function finishSession(sessionId: string): Promise<RouteSession> {
  return request(`/api/v2/sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
