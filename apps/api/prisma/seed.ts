import "dotenv/config";

import { demoGraph } from "../src/fixtures/demo-graph.js";
import { createPrismaProductRepository } from "../src/repositories/prisma-product-repository.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed PathMemory.");
}

const repository = createPrismaProductRepository(connectionString);

try {
  await repository.saveGraph(demoGraph);
  console.info(`Seeded deterministic demo graph ${demoGraph.id}.`);
} finally {
  await repository.disconnect();
}
