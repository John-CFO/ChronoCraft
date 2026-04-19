/////////////////////////////// rateLimitContext.ts /////////////////////////////

// This file contains the rate limit context builder function.

/////////////////////////////////////////////////////////////////////////////////

import { CallableRequest } from "firebase-functions/v2/https";

/////////////////////////////////////////////////////////////////////////////////

export function buildRateLimitContext(request: CallableRequest, uid: string) {
  const rawIp = request.rawRequest.headers["x-forwarded-for"];

  const ip =
    typeof rawIp === "string"
      ? rawIp.split(",")[0].trim()
      : request.rawRequest.socket?.remoteAddress || "unknown";

  const deviceId =
    typeof request.data?.deviceId === "string" &&
    request.data.deviceId.trim().length > 0
      ? request.data.deviceId.trim()
      : "unknown-device";

  return { ip, deviceId, uid };
}
