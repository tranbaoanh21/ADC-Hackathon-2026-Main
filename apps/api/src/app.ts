import cors from "cors";
import express from "express";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: false }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "pathmemory-api",
      productApiVersion: "2.0.0",
    });
  });

  return app;
}
