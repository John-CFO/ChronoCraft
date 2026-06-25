///////////////////////// loggerClient.ts ////////////////////////

// This file contains client logging function that are only used in development

////////////////////////////////////////////////////////////////////

export function logError(context: string, error: unknown) {
  if (__DEV__) {
    console.error(`[${context}]`, error);
  }
}

export function logWarn(context: string, message: unknown) {
  if (__DEV__) {
    console.warn(`[${context}]`, message);
  }
}

export function logInfo(context: string, message: unknown) {
  if (__DEV__) {
    console.log(`[${context}]`, message);
  }
}

export function logEvent(context: string, data: unknown) {
  if (__DEV__) {
    console.log(`[EVENT:${context}]`, data);
  }
}
