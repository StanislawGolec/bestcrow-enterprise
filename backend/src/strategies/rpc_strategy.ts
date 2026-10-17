export interface RpcEndpointStatus {
  url: string;
  isHealthy: boolean;
  failureCount: number;
  lastFailureTime: number | null;
}

export interface RpcStrategy {
  getActiveUrl(): string;
  reportSuccess(url: string): void;
  reportFailure(url: string, error: unknown): void;
  getStatus(): { primary: RpcEndpointStatus; fallback: RpcEndpointStatus };
}

export class PrimaryFallbackRpcStrategy implements RpcStrategy {
  private readonly primary: RpcEndpointStatus;
  private readonly fallback: RpcEndpointStatus;
  private activeUrl: string;
  private readonly recoveryIntervalMs = 60_000;

  constructor(primaryUrl: string, fallbackUrl: string) {
    this.primary = {
      url: primaryUrl,
      isHealthy: true,
      failureCount: 0,
      lastFailureTime: null,
    };
    this.fallback = {
      url: fallbackUrl,
      isHealthy: true,
      failureCount: 0,
      lastFailureTime: null,
    };
    this.activeUrl = primaryUrl;
  }

  getActiveUrl(): string {
    const now = Date.now();
    if (!this.primary.isHealthy && this.primary.lastFailureTime && now - this.primary.lastFailureTime > this.recoveryIntervalMs) {
      this.primary.isHealthy = true;
      this.activeUrl = this.primary.url;
    }
    return this.activeUrl;
  }

  reportSuccess(url: string): void {
    if (url === this.primary.url) {
      this.primary.isHealthy = true;
      this.primary.failureCount = 0;
      this.primary.lastFailureTime = null;
    } else if (url === this.fallback.url) {
      this.fallback.isHealthy = true;
      this.fallback.failureCount = 0;
    }
  }

  reportFailure(url: string, _error: unknown): void {
    const now = Date.now();
    if (url === this.primary.url) {
      this.primary.failureCount += 1;
      this.primary.lastFailureTime = now;
      if (this.primary.failureCount >= 2) {
        this.primary.isHealthy = false;
        this.activeUrl = this.fallback.url;
      }
    } else if (url === this.fallback.url) {
      this.fallback.failureCount += 1;
      this.fallback.lastFailureTime = now;
      this.fallback.isHealthy = false;
      this.activeUrl = this.primary.url;
    }
  }

  getStatus(): { primary: RpcEndpointStatus; fallback: RpcEndpointStatus } {
    return {
      primary: { ...this.primary },
      fallback: { ...this.fallback },
    };
  }
}
