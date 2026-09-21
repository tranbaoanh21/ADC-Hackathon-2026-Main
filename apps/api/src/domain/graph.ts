import {
  type Landmark,
  type LandmarkSummary,
  type NavigationPath,
  ProductDomainError,
  type RouteEdge,
  toLandmarkSummary,
  type WorkplaceGraph,
} from "./types.js";

export interface GraphIssue {
  readonly field: string;
  readonly issue: string;
}

function compareEdges(left: RouteEdge, right: RouteEdge): number {
  return left.displayOrder - right.displayOrder || left.id.localeCompare(right.id);
}

function compareLandmarks(left: Landmark, right: Landmark): number {
  return left.displayOrder - right.displayOrder || left.id.localeCompare(right.id);
}

export function validateGraph(graph: WorkplaceGraph): readonly GraphIssue[] {
  const issues: GraphIssue[] = [];
  const landmarkIds = new Set<string>();

  for (const landmark of graph.landmarks) {
    if (landmarkIds.has(landmark.id)) {
      issues.push({ field: "landmarks", issue: `Duplicate landmark id: ${landmark.id}` });
    }
    landmarkIds.add(landmark.id);
  }

  const edgeIds = new Set<string>();
  const directedPairs = new Set<string>();

  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ field: "edges", issue: `Duplicate edge id: ${edge.id}` });
    }
    edgeIds.add(edge.id);

    if (edge.fromLandmarkId === edge.toLandmarkId) {
      issues.push({ field: "edges", issue: `Self-loop is not allowed: ${edge.id}` });
    }

    if (!landmarkIds.has(edge.fromLandmarkId) || !landmarkIds.has(edge.toLandmarkId)) {
      issues.push({
        field: "edges",
        issue: `Edge references a landmark outside the graph: ${edge.id}`,
      });
    }

    const pairKey = `${edge.fromLandmarkId}->${edge.toLandmarkId}`;
    if (directedPairs.has(pairKey)) {
      issues.push({ field: "edges", issue: `Duplicate directed pair: ${pairKey}` });
    }
    directedPairs.add(pairKey);
  }

  return issues;
}

function assertPublishedValidGraph(graph: WorkplaceGraph): void {
  if (graph.status !== "PUBLISHED") {
    throw new ProductDomainError("INVALID_STATE", "Navigation requires a published graph.");
  }

  const issues = validateGraph(graph);
  if (issues.length > 0) {
    throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", issues[0]?.issue ?? "Invalid graph.");
  }
}

function getPublishedLandmark(graph: WorkplaceGraph, landmarkId: string): Landmark {
  const landmark = graph.landmarks.find(
    (candidate) => candidate.id === landmarkId && candidate.status === "PUBLISHED",
  );

  if (!landmark) {
    throw new ProductDomainError("NOT_FOUND", `Published landmark not found: ${landmarkId}`);
  }

  return landmark;
}

function getOutgoingEdges(graph: WorkplaceGraph, fromLandmarkId: string): readonly RouteEdge[] {
  return graph.edges.filter((edge) => edge.fromLandmarkId === fromLandmarkId).sort(compareEdges);
}

export function listReachableDestinations(
  graph: WorkplaceGraph,
  originLandmarkId: string,
): readonly LandmarkSummary[] {
  assertPublishedValidGraph(graph);
  getPublishedLandmark(graph, originLandmarkId);

  const publishedIds = new Set(
    graph.landmarks
      .filter((landmark) => landmark.status === "PUBLISHED")
      .map((landmark) => landmark.id),
  );
  const visited = new Set([originLandmarkId]);
  const queue = [originLandmarkId];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const currentId = queue[queueIndex];
    if (!currentId) {
      continue;
    }

    for (const edge of getOutgoingEdges(graph, currentId)) {
      if (!publishedIds.has(edge.toLandmarkId) || visited.has(edge.toLandmarkId)) {
        continue;
      }
      visited.add(edge.toLandmarkId);
      queue.push(edge.toLandmarkId);
    }
  }

  return graph.landmarks
    .filter((landmark) => landmark.id !== originLandmarkId && visited.has(landmark.id))
    .sort(compareLandmarks)
    .map(toLandmarkSummary);
}

export function planFewestEdgesPath(
  graph: WorkplaceGraph,
  originLandmarkId: string,
  destinationLandmarkId: string,
): NavigationPath {
  assertPublishedValidGraph(graph);
  getPublishedLandmark(graph, originLandmarkId);
  getPublishedLandmark(graph, destinationLandmarkId);

  if (originLandmarkId === destinationLandmarkId) {
    throw new ProductDomainError(
      "NO_ROUTE_AVAILABLE",
      "Origin and destination must be different landmarks.",
    );
  }

  const visited = new Set([originLandmarkId]);
  const queue = [originLandmarkId];
  const previous = new Map<string, { landmarkId: string; edgeId: string }>();

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const currentId = queue[queueIndex];
    if (!currentId) {
      continue;
    }

    for (const edge of getOutgoingEdges(graph, currentId)) {
      if (visited.has(edge.toLandmarkId)) {
        continue;
      }

      const nextLandmark = graph.landmarks.find(
        (landmark) => landmark.id === edge.toLandmarkId && landmark.status === "PUBLISHED",
      );
      if (!nextLandmark) {
        continue;
      }

      visited.add(edge.toLandmarkId);
      previous.set(edge.toLandmarkId, { landmarkId: currentId, edgeId: edge.id });
      queue.push(edge.toLandmarkId);

      if (edge.toLandmarkId === destinationLandmarkId) {
        queueIndex = queue.length;
        break;
      }
    }
  }

  if (!previous.has(destinationLandmarkId)) {
    throw new ProductDomainError(
      "NO_ROUTE_AVAILABLE",
      "No published directed path connects the selected landmarks.",
    );
  }

  const landmarkIds = [destinationLandmarkId];
  const edgeIds: string[] = [];
  let cursor = destinationLandmarkId;

  while (cursor !== originLandmarkId) {
    const step = previous.get(cursor);
    if (!step) {
      throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", "Path reconstruction failed.");
    }
    landmarkIds.push(step.landmarkId);
    edgeIds.push(step.edgeId);
    cursor = step.landmarkId;
  }

  landmarkIds.reverse();
  edgeIds.reverse();

  return { originLandmarkId, destinationLandmarkId, landmarkIds, edgeIds };
}

export function getGraphLandmark(graph: WorkplaceGraph, landmarkId: string): Landmark {
  return getPublishedLandmark(graph, landmarkId);
}

export function getGraphEdge(graph: WorkplaceGraph, edgeId: string): RouteEdge {
  const edge = graph.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) {
    throw new ProductDomainError("INVALID_ROUTE_TOPOLOGY", `Path edge not found: ${edgeId}`);
  }
  return edge;
}
