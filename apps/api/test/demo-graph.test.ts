import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  listReachableDestinations,
  planFewestEdgesPath,
  validateGraph,
} from "../src/domain/graph.js";
import { demoGraph, demoLandmarkIds } from "../src/fixtures/demo-graph.js";

describe("demo graph fixture", () => {
  it("stays identical to the canonical contract example", async () => {
    const fixtureUrl = new URL(
      "../../../contracts/examples/product-route-published.json",
      import.meta.url,
    );
    const contractFixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

    expect(demoGraph).toEqual(contractFixture);
  });

  it("has valid directed topology", () => {
    expect(validateGraph(demoGraph)).toEqual([]);
  });

  it("lists published destinations reachable from Reception in display order", () => {
    const destinations = listReachableDestinations(demoGraph, demoLandmarkIds.reception);

    expect(destinations.map((landmark) => landmark.id)).toEqual([
      demoLandmarkIds.elevator,
      demoLandmarkIds.meetingRoom,
      demoLandmarkIds.restroom,
    ]);
  });

  it("plans Reception to Meeting Room through the elevator", () => {
    expect(
      planFewestEdgesPath(demoGraph, demoLandmarkIds.reception, demoLandmarkIds.meetingRoom),
    ).toEqual({
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.meetingRoom,
      landmarkIds: [
        demoLandmarkIds.reception,
        demoLandmarkIds.elevator,
        demoLandmarkIds.meetingRoom,
      ],
      edgeIds: ["18679377-b5fd-482f-83e5-7f6d16833296", "65a345da-0928-47a2-98f5-ae6560313a3d"],
    });
  });

  it("plans Reception to Restroom through the elevator", () => {
    expect(
      planFewestEdgesPath(demoGraph, demoLandmarkIds.reception, demoLandmarkIds.restroom),
    ).toEqual({
      originLandmarkId: demoLandmarkIds.reception,
      destinationLandmarkId: demoLandmarkIds.restroom,
      landmarkIds: [demoLandmarkIds.reception, demoLandmarkIds.elevator, demoLandmarkIds.restroom],
      edgeIds: ["18679377-b5fd-482f-83e5-7f6d16833296", "a388647a-1e03-471e-9719-5c6d7ced01a4"],
    });
  });

  it("uses explicit reverse edges for Meeting Room to Reception", () => {
    const path = planFewestEdgesPath(
      demoGraph,
      demoLandmarkIds.meetingRoom,
      demoLandmarkIds.reception,
    );

    expect(path.landmarkIds).toEqual([
      demoLandmarkIds.meetingRoom,
      demoLandmarkIds.elevator,
      demoLandmarkIds.reception,
    ]);
  });

  it("rejects the same origin and destination", () => {
    expect(() =>
      planFewestEdgesPath(demoGraph, demoLandmarkIds.reception, demoLandmarkIds.reception),
    ).toThrowError(/different landmarks/);
  });

  it("rejects an unreachable destination", () => {
    const graphWithoutOutgoingReception = {
      ...demoGraph,
      edges: demoGraph.edges.filter((edge) => edge.fromLandmarkId !== demoLandmarkIds.reception),
    };

    expect(() =>
      planFewestEdgesPath(
        graphWithoutOutgoingReception,
        demoLandmarkIds.reception,
        demoLandmarkIds.meetingRoom,
      ),
    ).toThrowError(/No published directed path/);
  });
});
