import { Request, Response, NextFunction } from 'express';

export interface HistogramConfig {
  buckets: number[];
}

export class MetricsService {
  private readonly defaultBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0];

  // Counters: key -> value
  private readonly httpRequestsTotal = new Map<string, number>();
  private readonly rpcRequestsTotal = new Map<string, number>();
  private rpcFailoverTotal = 0;

  // Histograms: routeKey -> { buckets: Map<number, number>, sum: number, count: number }
  private readonly httpDurationHistograms = new Map<
    string,
    { buckets: Map<number, number>; sum: number; count: number }
  >();

  // Gauges
  private activeCampaigns = 0;
  private sseConnections = 0;
  private activeBackers = 0;

  recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const statusGroup = String(statusCode);
    const counterKey = `method="${method}",route="${route}",status="${statusGroup}"`;
    this.httpRequestsTotal.set(counterKey, (this.httpRequestsTotal.get(counterKey) || 0) + 1);

    const histogramKey = `method="${method}",route="${route}"`;
    let hist = this.httpDurationHistograms.get(histogramKey);
    if (!hist) {
      const buckets = new Map<number, number>();
      for (const b of this.defaultBuckets) {
        buckets.set(b, 0);
      }
      hist = { buckets, sum: 0, count: 0 };
      this.httpDurationHistograms.set(histogramKey, hist);
    }

    hist.sum += durationSeconds;
    hist.count += 1;
    for (const b of this.defaultBuckets) {
      if (durationSeconds <= b) {
        hist.buckets.set(b, (hist.buckets.get(b) || 0) + 1);
      }
    }
  }

  recordRpcRequest(endpoint: string, status: 'success' | 'failure'): void {
    const key = `endpoint="${endpoint}",status="${status}"`;
    this.rpcRequestsTotal.set(key, (this.rpcRequestsTotal.get(key) || 0) + 1);
  }

  recordRpcFailover(): void {
    this.rpcFailoverTotal += 1;
  }

  setActiveCampaigns(count: number): void {
    this.activeCampaigns = Math.max(0, count);
  }

  setSseConnections(count: number): void {
    this.sseConnections = Math.max(0, count);
  }

  setActiveBackers(count: number): void {
    this.activeBackers = Math.max(0, count);
  }

  generateExpositionText(): string {
    const lines: string[] = [];

    // 1. Process uptime & memory
    lines.push('# HELP process_uptime_seconds The process uptime in seconds.');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${Math.floor(process.uptime())}`);

    const mem = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes.');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);

    // 2. HTTP Requests Total
    lines.push('# HELP bestcrow_http_requests_total Total number of HTTP requests processed.');
    lines.push('# TYPE bestcrow_http_requests_total counter');
    if (this.httpRequestsTotal.size === 0) {
      lines.push('bestcrow_http_requests_total 0');
    } else {
      for (const [labels, val] of this.httpRequestsTotal.entries()) {
        lines.push(`bestcrow_http_requests_total{${labels}} ${val}`);
      }
    }

    // 3. HTTP Request Duration Histogram
    lines.push('# HELP bestcrow_http_request_duration_seconds HTTP request duration in seconds.');
    lines.push('# TYPE bestcrow_http_request_duration_seconds histogram');
    for (const [labels, hist] of this.httpDurationHistograms.entries()) {
      let cumulative = 0;
      for (const b of this.defaultBuckets) {
        cumulative += hist.buckets.get(b) || 0;
        lines.push(`bestcrow_http_request_duration_seconds_bucket{${labels},le="${b}"} ${cumulative}`);
      }
      lines.push(`bestcrow_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${hist.count}`);
      lines.push(`bestcrow_http_request_duration_seconds_sum{${labels}} ${hist.sum.toFixed(6)}`);
      lines.push(`bestcrow_http_request_duration_seconds_count{${labels}} ${hist.count}`);
    }

    // 4. Gauges
    lines.push('# HELP bestcrow_active_campaigns_count Current number of active campaigns in database.');
    lines.push('# TYPE bestcrow_active_campaigns_count gauge');
    lines.push(`bestcrow_active_campaigns_count ${this.activeCampaigns}`);

    lines.push('# HELP bestcrow_active_backers_count Total recorded backer contributions.');
    lines.push('# TYPE bestcrow_active_backers_count gauge');
    lines.push(`bestcrow_active_backers_count ${this.activeBackers}`);

    lines.push('# HELP bestcrow_sse_active_connections Number of active Server-Sent Events subscriber connections.');
    lines.push('# TYPE bestcrow_sse_active_connections gauge');
    lines.push(`bestcrow_sse_active_connections ${this.sseConnections}`);

    // 5. RPC Counters
    lines.push('# HELP bestcrow_rpc_requests_total Total Solana RPC calls dispatched by endpoint and status.');
    lines.push('# TYPE bestcrow_rpc_requests_total counter');
    for (const [labels, val] of this.rpcRequestsTotal.entries()) {
      lines.push(`bestcrow_rpc_requests_total{${labels}} ${val}`);
    }

    lines.push('# HELP bestcrow_rpc_failover_total Total number of times RPC failover was triggered.');
    lines.push('# TYPE bestcrow_rpc_failover_total counter');
    lines.push(`bestcrow_rpc_failover_total ${this.rpcFailoverTotal}`);

    return lines.join('\n') + '\n';
  }

  createMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (req.path === '/metrics') {
        next();
        return;
      }

      const startHr = process.hrtime.bigint();

      res.on('finish', () => {
        const endHr = process.hrtime.bigint();
        const durationSeconds = Number(endHr - startHr) / 1e9;
        const normalizedRoute = this.normalizeRoute(req.baseUrl + (req.route?.path || req.path));
        this.recordHttpRequest(req.method, normalizedRoute, res.statusCode, durationSeconds);
      });

      next();
    };
  }

  private normalizeRoute(route: string): string {
    return route
      .replace(/\/[1-9A-HJ-NP-Za-km-z]{32,44}/g, '/:address')
      .replace(/\/[0-9a-fA-F-]{36}/g, '/:uuid')
      .replace(/\/\d+/g, '/:id') || '/';
  }
}
