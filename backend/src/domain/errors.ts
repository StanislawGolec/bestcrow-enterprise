export class DomainError extends Error {
  constructor(message: string, public readonly statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity} with identifier '${identifier}' was not found.`, 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class BlockchainRpcError extends DomainError {
  constructor(message: string, public readonly originalCause?: unknown) {
    super(`Blockchain RPC interaction failed: ${message}`, 502);
  }
}
