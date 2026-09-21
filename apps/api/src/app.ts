import cors from "cors";
import express from "express";

import type { AiAdapter } from "./ai/ai-adapter.js";
import { MockAiAdapter } from "./ai/mock-ai-adapter.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { createProductRouter } from "./http/product-router.js";
import { InMemoryProductRepository } from "./repositories/in-memory-product-repository.js";
import type { ProductRepository } from "./repositories/product-repository.js";

export interface AppDependencies {
  readonly repository?: ProductRepository;
  readonly aiAdapter?: AiAdapter;
  readonly now?: () => string;
  readonly newId?: () => string;
  readonly corsOrigins?: readonly string[];
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  const repository = dependencies.repository ?? new InMemoryProductRepository();
  const aiAdapter = dependencies.aiAdapter ?? new MockAiAdapter();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: dependencies.corsOrigins?.length ? [...dependencies.corsOrigins] : false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "pathmemory-api",
      productApiVersion: "2.0.0",
    });
  });

  app.use(
    "/api/v2",
    createProductRouter({
      repository,
      aiAdapter,
      ...(dependencies.now ? { now: dependencies.now } : {}),
      ...(dependencies.newId ? { newId: dependencies.newId } : {}),
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
