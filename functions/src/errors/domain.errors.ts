//////////////////////////////// domain.errors.ts ///////////////////////////////

// This file contains the domain errors used in the application

///////////////////////////////////////////////////////////////////////////////

export class DomainError extends Error {
  // define the constructor method
  constructor(
    message: string,
    public code: string,
    public userMessageKey?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  // return the JSON representation of the error
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessageKey: this.userMessageKey,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

// Export specified domain errors with messages and security wrapper
export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "validation-error", "errors.invalidEntry", details);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, details?: any) {
    super(
      `${resource} not found`,
      "not-found",
      "errors.resourceNotFound",
      details,
    );
  }
}

export class PermissionError extends DomainError {
  constructor(action: string, details?: any) {
    super(
      `Permission denied for ${action}`,
      "permission-denied",
      "errors.permissionDenied",
      details,
    );
  }
}

export class FailedPreconditionError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "failed-precondition", "errors.failedPrecondition", details);
  }
}

export class AuthenticationError extends DomainError {
  constructor(message = "Authentication required", details?: any) {
    super(message, "authentication-error", "errors.unauthenticated", details);
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = "Not authorized") {
    super(message, "authorization-error", "errors.notAuthorized");
  }
}

export class RateLimitError extends DomainError {
  public retryAfterSeconds?: number;

  constructor(details?: any, retryAfterSeconds?: number) {
    super(
      "Rate limit exceeded",
      "rate-limit-exceeded",
      "errors.tooManyRequests",
      details,
    );

    if (retryAfterSeconds) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, userMessageKey?: string, details?: any) {
    super(
      message,
      "business-rule-error",
      userMessageKey ?? "errors.businessRule",
      details,
    );
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "configuration-error", "errors.internal", details);
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "database-error", "errors.internal", details);
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, details?: any) {
    super(
      `External service ${service} error`,
      "external-service-error",
      "errors.unavailable",
      details,
    );
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "conflict-error", "errors.conflict", details);
  }
}
