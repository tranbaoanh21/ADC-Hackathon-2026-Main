import { createApp } from "./app.js";

const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isFinite(parsedPort) ? parsedPort : 3000;

createApp().listen(port, "0.0.0.0", () => {
  console.info(`PathMemory API listening on port ${port}`);
});
