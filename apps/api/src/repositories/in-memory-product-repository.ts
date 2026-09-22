import type {
  ProductSession,
  StoredObservation,
  WorkplaceGraph,
  WorkplaceSummary,
} from "../domain/types.js";
import { demoGraph } from "../fixtures/demo-graph.js";
import type { ProductRepository } from "./product-repository.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryProductRepository implements ProductRepository {
  readonly #graphs = new Map<string, WorkplaceGraph>();
  readonly #sessions = new Map<string, ProductSession>();
  readonly #observations = new Map<string, StoredObservation>();
  readonly #processedRequestKeys = new Set<string>();
  readonly #lastCapturedAt = new Map<string, string>();

  constructor(seedGraphs: readonly WorkplaceGraph[] = [demoGraph]) {
    for (const graph of seedGraphs) {
      this.#graphs.set(graph.id, clone(graph));
    }
  }

  async listGraphs(): Promise<readonly WorkplaceSummary[]> {
    return [...this.#graphs.values()]
      .map((graph) => ({
        id: graph.id,
        name: graph.name,
        status: graph.status,
        landmarkCount: graph.landmarks.length,
        createdAt: graph.createdAt,
      }))
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) || left.name.localeCompare(right.name),
      )
      .map(clone);
  }

  async getGraph(routeId: string): Promise<WorkplaceGraph | null> {
    const graph = this.#graphs.get(routeId);
    return graph ? clone(graph) : null;
  }

  async saveGraph(graph: WorkplaceGraph): Promise<WorkplaceGraph> {
    this.#graphs.set(graph.id, clone(graph));
    return clone(graph);
  }

  async getSession(sessionId: string): Promise<ProductSession | null> {
    const session = this.#sessions.get(sessionId);
    return session ? clone(session) : null;
  }

  async saveSession(session: ProductSession): Promise<ProductSession> {
    this.#sessions.set(session.id, clone(session));
    return clone(session);
  }

  async getObservations(observationIds: readonly string[]): Promise<readonly StoredObservation[]> {
    return observationIds.flatMap((id) => {
      const observation = this.#observations.get(id);
      return observation ? [clone(observation)] : [];
    });
  }

  async saveObservation(observation: StoredObservation): Promise<StoredObservation> {
    this.#observations.set(observation.id, clone(observation));
    return clone(observation);
  }

  async isRequestProcessed(sessionId: string, requestId: string): Promise<boolean> {
    return this.#processedRequestKeys.has(`${sessionId}:${requestId}`);
  }

  async getLastCapturedAt(sessionId: string): Promise<string | null> {
    return this.#lastCapturedAt.get(sessionId) ?? null;
  }

  async markRequestProcessed(
    sessionId: string,
    requestId: string,
    capturedAt: string,
  ): Promise<void> {
    this.#processedRequestKeys.add(`${sessionId}:${requestId}`);
    this.#lastCapturedAt.set(sessionId, capturedAt);
  }
}
