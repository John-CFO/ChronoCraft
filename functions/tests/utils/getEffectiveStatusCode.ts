//////////////////////////// getEffectiveStatusCode.ts //////////////////////////////

// This file contains the implementation of the getEffectiveStatusCode function,
// which is used to get the effective status code of a response.

//////////////////////////////////////////////////////////////////////////////////////

type CallResult = {
  status: number;
  body: any;
};

const unwrapBody = (body: any): any => {
  if (body && typeof body === "object" && "result" in body) {
    return body.result;
  }
  return body;
};

const isFirebaseError = (body: any): boolean =>
  body &&
  typeof body === "object" &&
  ("code" in body || ("error" in body && typeof body.error === "object"));

const getErrorCode = (body: any): string | undefined => {
  const unwrapped = unwrapBody(body);
  if (!unwrapped) return undefined;
  if (typeof unwrapped === "object" && "code" in unwrapped)
    return unwrapped.code;
  if (typeof unwrapped === "object" && "error" in unwrapped)
    return unwrapped.error?.code;
  return undefined;
};

const normalizeErrorCode = (code: string): string => {
  return code.toLowerCase().replace(/^(auth|functions|internal)\//, "");
};

export function getEffectiveStatusCode(res: CallResult): number {
  if (typeof res.body === "string") {
    return res.status;
  }

  const body = unwrapBody(res.body);
  if (!body) return res.status || 500;

  if (typeof body === "object" && body !== null) {
    if (body.valid === false && typeof body.retryAfterSeconds === "number") {
      return 429;
    }

    if (body.valid === true) {
      return res.status;
    }
  }

  if (body.error && body.error.status) {
    const statusMap: Record<string, number> = {
      INVALID_ARGUMENT: 400,
      UNAUTHENTICATED: 401,
      PERMISSION_DENIED: 403,
      NOT_FOUND: 404,
      ALREADY_EXISTS: 409,
      RESOURCE_EXHAUSTED: 429,
      FAILED_PRECONDITION: 412,
      ABORTED: 409,
      OUT_OF_RANGE: 400,
      UNIMPLEMENTED: 501,
      INTERNAL: 500,
      UNAVAILABLE: 503,
      DEADLINE_EXCEEDED: 504,
    };
    return statusMap[body.error.status] ?? res.status;
  }

  if (isFirebaseError(body)) {
    const code = getErrorCode(body);
    if (code) {
      const normalized = normalizeErrorCode(code);
      if (normalized.includes("unauthenticated")) return 401;
      if (normalized.includes("permission-denied")) return 403;
      if (normalized.includes("invalid-argument")) return 400;
      if (normalized.includes("failed-precondition")) return 412;
      if (normalized.includes("not-found")) return 404;
      if (normalized.includes("resource-exhausted")) return 429;
    }
    return 500;
  }

  return res.status;
}
