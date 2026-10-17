import { DomainError } from '../domain/errors.js';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerOpenError extends DomainError {
  constructor(message: string = 'Circuit breaker is OPEN. Fast-failing downstream request.') {
    super(message, 503);
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeoutMs?: number;
  failureWindowMs?: number;
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private consecutiveSuccesses = 0;
  private lastTripTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly failureWindowMs: number;
  private readonly onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.failureWindowMs = options.failureWindowMs ?? 30000;
    this.onStateChange = options.onStateChange;
  }

  getState(): CircuitBreakerState {
    const now = Date.now();
    if (this.state === 'OPEN' && this.lastTripTime && now - this.lastTripTime >= this.resetTimeoutMs) {
      this.transitionTo('HALF_OPEN');
    }
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      throw new CircuitBreakerOpenError();
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses += 1;
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.cleanStaleFailures();
    }
  }

  recordFailure(): void {
    const now = Date.now();
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
      return;
    }

    this.failureTimestamps.push(now);
    this.cleanStaleFailures();

    if (this.failureTimestamps.length >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  reset(): void {
    this.transitionTo('CLOSED');
    this.failureTimestamps = [];
    this.consecutiveSuccesses = 0;
    this.lastTripTime = null;
  }

  trip(): void {
    this.transitionTo('OPEN');
  }

  getStats(): {
    state: CircuitBreakerState;
    failureCount: number;
    consecutiveSuccesses: number;
    lastTripTime: number | null;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureTimestamps.length,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastTripTime: this.lastTripTime,
    };
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;

    if (newState === 'OPEN') {
      this.lastTripTime = Date.now();
      this.consecutiveSuccesses = 0;
    } else if (newState === 'CLOSED') {
      this.failureTimestamps = [];
      this.consecutiveSuccesses = 0;
      this.lastTripTime = null;
    } else if (newState === 'HALF_OPEN') {
      this.consecutiveSuccesses = 0;
    }

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  private cleanStaleFailures(): void {
    const now = Date.now();
    const cutoff = now - this.failureWindowMs;
    this.failureTimestamps = this.failureTimestamps.filter((t) => t > cutoff);
  }
}
