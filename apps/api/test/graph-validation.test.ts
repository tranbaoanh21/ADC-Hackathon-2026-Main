import { describe, expect, it } from "vitest";

import { validateGraph } from "../src/domain/graph.js";
import { demoGraph } from "../src/fixtures/demo-graph.js";

describe("graph validation", () => {
  it("reports self-loops", () => {
    const firstEdge = demoGraph.edges[0];
    const graph = {
      ...demoGraph,
      edges: [{ ...firstEdge, toLandmarkId: firstEdge.fromLandmarkId }],
    };

    expect(validateGraph(graph)).toContainEqual({
      field: "edges",
      issue: `Self-loop is not allowed: ${firstEdge.id}`,
    });
  });

  it("reports duplicate directed pairs", () => {
    const firstEdge = demoGraph.edges[0];
    const graph = {
      ...demoGraph,
      edges: [firstEdge, { ...firstEdge, id: "duplicate-edge" }],
    };

    expect(validateGraph(graph)).toContainEqual({
      field: "edges",
      issue: `Duplicate directed pair: ${firstEdge.fromLandmarkId}->${firstEdge.toLandmarkId}`,
    });
  });

  it("reports references outside the graph", () => {
    const firstEdge = demoGraph.edges[0];
    const graph = {
      ...demoGraph,
      edges: [{ ...firstEdge, toLandmarkId: "missing-landmark" }],
    };

    expect(validateGraph(graph)).toContainEqual({
      field: "edges",
      issue: `Edge references a landmark outside the graph: ${firstEdge.id}`,
    });
  });
});
