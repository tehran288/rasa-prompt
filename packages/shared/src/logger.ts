import pino from "pino";

export function createLogger(name: string, level = process.env.LOG_LEVEL ?? "info") {
  return pino({
    name,
    level,
    redact: ["*.token", "*.apiKey", "*.providerToken", "headers.authorization"],
    ...(process.env.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  });
}
export type Logger = ReturnType<typeof createLogger>;
