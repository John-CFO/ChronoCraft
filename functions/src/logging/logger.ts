///////////////////////// logger.ts ////////////////////////

// This file contains the function that logs events to the console

///////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

///////////////////////////////////////////////////////////

// Admin-Init
if (!admin.apps.length) {
  admin.initializeApp();
}

// Log-Level: info, warn, error

export function logEvent(
  message: string,
  level: "info" | "warn" | "error" = "info",
  metadata?: Record<string, unknown>
) {
  const logEntry = {
    message,
    level,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // console.log(logEntry for Cloud Functions Logs);
  switch (level) {
    case "info":
      console.info(logEntry);
      break;
    case "warn":
      console.warn(logEntry);
      break;
    case "error":
      console.error(logEntry);
      break;
  }

  // Optional: save to Firestore
  // admin.firestore().collection("functionLogs").add(logEntry);
}
