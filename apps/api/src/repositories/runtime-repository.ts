import { InMemoryProductRepository } from "./in-memory-product-repository.js";
import {
  createPrismaProductRepository,
  type PrismaProductRepository,
} from "./prisma-product-repository.js";
import type { ProductRepository } from "./product-repository.js";

export interface RuntimeRepository {
  readonly repository: ProductRepository;
  readonly disconnect: () => Promise<void>;
}

export function createRuntimeRepository(environment = process.env): RuntimeRepository {
  const mode = environment.PERSISTENCE_MODE ?? "memory";
  if (mode === "memory") {
    return {
      repository: new InMemoryProductRepository(),
      disconnect: async () => undefined,
    };
  }
  if (mode !== "postgres") {
    throw new Error("PERSISTENCE_MODE must be either memory or postgres.");
  }
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when PERSISTENCE_MODE=postgres.");
  }
  const repository: PrismaProductRepository = createPrismaProductRepository(connectionString);
  return { repository, disconnect: () => repository.disconnect() };
}
