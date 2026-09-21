import { getGraphEdge, getGraphLandmark, planFewestEdgesPath } from "./graph.js";
import {
  type LandmarkMatchStatus,
  type NavigationSession,
  type NavigationTransition,
  ProductDomainError,
  toLandmarkSummary,
  type WorkplaceGraph,
} from "./types.js";

export interface CreateNavigationSessionInput {
  readonly id: string;
  readonly graph: WorkplaceGraph;
  readonly originLandmarkId: string;
  readonly destinationLandmarkId: string;
  readonly startedAt: string;
}

export function createNavigationSession(input: CreateNavigationSessionInput): NavigationSession {
  const plannedPath = planFewestEdgesPath(
    input.graph,
    input.originLandmarkId,
    input.destinationLandmarkId,
  );

  return {
    id: input.id,
    routeId: input.graph.id,
    mode: "NAVIGATE",
    status: "AWAITING_START_CONFIRMATION",
    currentPathIndex: 0,
    originLandmarkId: input.originLandmarkId,
    destinationLandmarkId: input.destinationLandmarkId,
    expectedLandmarkId: input.originLandmarkId,
    plannedPath,
    startedAt: input.startedAt,
    finishedAt: null,
  };
}

function rescanTransition(
  session: NavigationSession,
  graph: WorkplaceGraph,
  matchStatus: Exclude<LandmarkMatchStatus, "MATCHED">,
): NavigationTransition {
  const expected = session.expectedLandmarkId
    ? toLandmarkSummary(getGraphLandmark(graph, session.expectedLandmarkId))
    : null;
  const awaitingStart = session.status === "AWAITING_START_CONFIRMATION";

  return {
    session,
    routeState: awaitingStart ? "AWAITING_START_CONFIRMATION" : "STOP_AND_RESCAN",
    landmarkMatchStatus: matchStatus,
    expectedLandmark: expected,
    spokenMessage: awaitingStart
      ? `Chưa xác nhận được ${expected?.name ?? "landmark xuất phát"}. Hãy đứng yên, hướng camera về biển chỉ dẫn và quét lại.`
      : `Chưa xác nhận được ${expected?.name ?? "landmark tiếp theo"}. Hãy dừng lại và quét lại.`,
    shouldAdvance: false,
  };
}

export function transitionNavigationSession(
  session: NavigationSession,
  graph: WorkplaceGraph,
  matchStatus: LandmarkMatchStatus,
  observedAt: string,
): NavigationTransition {
  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    throw new ProductDomainError("INVALID_STATE", "The navigation session is not active.");
  }

  if (session.routeId !== graph.id) {
    throw new ProductDomainError("INVALID_STATE", "Session and graph do not match.");
  }

  if (matchStatus !== "MATCHED") {
    return rescanTransition(session, graph, matchStatus);
  }

  const currentIndex = session.currentPathIndex;
  const currentLandmarkId = session.plannedPath.landmarkIds[currentIndex];
  if (!currentLandmarkId || currentLandmarkId !== session.expectedLandmarkId) {
    throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", "Session path state is inconsistent.");
  }

  const isDestination = currentIndex === session.plannedPath.landmarkIds.length - 1;
  if (isDestination) {
    const destination = getGraphLandmark(graph, currentLandmarkId);
    const completedSession: NavigationSession = {
      ...session,
      status: "COMPLETED",
      expectedLandmarkId: null,
      finishedAt: observedAt,
    };

    return {
      session: completedSession,
      routeState: "ROUTE_COMPLETED",
      landmarkMatchStatus: "MATCHED",
      expectedLandmark: null,
      spokenMessage: `Đã đến ${destination.name}.`,
      shouldAdvance: true,
    };
  }

  const nextIndex = currentIndex + 1;
  const nextLandmarkId = session.plannedPath.landmarkIds[nextIndex];
  const outgoingEdgeId = session.plannedPath.edgeIds[currentIndex];
  if (!nextLandmarkId || !outgoingEdgeId) {
    throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", "The next path step is missing.");
  }

  const currentLandmark = getGraphLandmark(graph, currentLandmarkId);
  const nextLandmark = getGraphLandmark(graph, nextLandmarkId);
  const outgoingEdge = getGraphEdge(graph, outgoingEdgeId);
  if (
    outgoingEdge.fromLandmarkId !== currentLandmarkId ||
    outgoingEdge.toLandmarkId !== nextLandmarkId
  ) {
    throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", "The path edge endpoints are invalid.");
  }

  const activeSession: NavigationSession = {
    ...session,
    status: "ACTIVE",
    currentPathIndex: nextIndex,
    expectedLandmarkId: nextLandmarkId,
  };

  return {
    session: activeSession,
    routeState: "SEEKING_LANDMARK",
    landmarkMatchStatus: "MATCHED",
    expectedLandmark: toLandmarkSummary(nextLandmark),
    spokenMessage: `Đã xác nhận ${currentLandmark.name}. ${outgoingEdge.spokenCue}`,
    shouldAdvance: true,
  };
}
