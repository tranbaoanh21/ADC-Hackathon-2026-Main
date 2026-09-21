import type { ProductSession, StoredObservation, WorkplaceGraph } from "../domain/types.js";

export interface ProductRepository {
  getGraph(routeId: string): Promise<WorkplaceGraph | null>;
  saveGraph(graph: WorkplaceGraph): Promise<WorkplaceGraph>;
  getSession(sessionId: string): Promise<ProductSession | null>;
  saveSession(session: ProductSession): Promise<ProductSession>;
  getObservations(observationIds: readonly string[]): Promise<readonly StoredObservation[]>;
  saveObservation(observation: StoredObservation): Promise<StoredObservation>;
  isRequestProcessed(sessionId: string, requestId: string): Promise<boolean>;
  getLastCapturedAt(sessionId: string): Promise<string | null>;
  markRequestProcessed(sessionId: string, requestId: string, capturedAt: string): Promise<void>;
}
