export interface RetryPolicyOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
}

const DEFAULT_OPTIONS: RetryPolicyOptions = {
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 5000,
  backoffFactor: 2,
};

export class ExponentialBackoffRetry {
  private readonly options: RetryPolicyOptions;

  constructor(options: Partial<RetryPolicyOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delay = this.options.initialDelayMs;

    while (attempt < this.options.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        if (attempt >= this.options.maxAttempts) {
          throw error;
        }

        const jitter = Math.random() * 0.2 * delay;
        const totalDelay = Math.min(delay + jitter, this.options.maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        delay *= this.options.backoffFactor;
      }
    }

    throw new Error('Retry exhausted without result');
  }
}
