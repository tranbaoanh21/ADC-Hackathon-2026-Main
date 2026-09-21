import "dotenv/config";

import { createRuntimeAiAdapter } from "./ai/runtime-ai-adapter.js";
import { createApp } from "./app.js";
import { createRuntimeRepository } from "./repositories/runtime-repository.js";

const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 3000;
const runtimeRepository = createRuntimeRepository();
const runtimeAi = createRuntimeAiAdapter(process.env);
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = createApp({
  repository: runtimeRepository.repository,
  aiAdapter: runtimeAi.adapter,
  corsOrigins,
}).listen(port, "0.0.0.0", () => {
  console.info(`PathMemory API listening on port ${port}; AI adapter mode: ${runtimeAi.mode}.`);
});

async function shutdown(signal: string): Promise<void> {
  console.info(`Received ${signal}; shutting down PathMemory API.`);
  server.close(async () => {
    await runtimeRepository.disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
