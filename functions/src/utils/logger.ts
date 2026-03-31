///////////////////////////// logger.ts /////////////////////////////////////////

// This file contains the implementation of the logEvent function,
// which is used to log events to the console.

/////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

/////////////////////////////////////////////////////////////////////////////////

// Admin-Init
if (!admin.apps.length) {
  admin.initializeApp();
}

export interface LogEntry {
  message: string;
  level: "info" | "warn" | "error";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  logEvent(
    message: string,
    level?: "info" | "warn" | "error",
    metadata?: Record<string, unknown>,
  ): void;
}

/////////////////////////////////////////////////////////////////////////////////

export function logEvent(
  message: string,
  level: "info" | "warn" | "error" = "info",
  metadata?: Record<string, unknown>,
) {
  const logEntry: LogEntry = {
    message,
    level,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Cases for different log levels
  switch (level) {
    case "info":
      console.info(JSON.stringify(logEntry));
      break;
    case "warn":
      console.warn(JSON.stringify(logEntry));
      break;
    case "error":
      console.error(JSON.stringify(logEntry));
      break;
  }
}

export const defaultLogger: Logger = {
  logEvent,
};
