import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(
    `Kwetu Finance Tracker API listening on port ${env.PORT} (${env.NODE_ENV})`,
  );
});

function shutdown(signal: string): void {
  console.log(`${signal} received. Closing the API server...`);

  server.close((error) => {
    if (error) {
      console.error("Server shutdown failed:", error.message);
      process.exitCode = 1;
      return;
    }

    console.log("API server closed successfully.");
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));