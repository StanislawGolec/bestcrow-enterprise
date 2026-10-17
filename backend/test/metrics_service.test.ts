import test from 'node:test';
import assert from 'node:assert/strict';
import { MetricsService } from '../src/services/metrics_service.js';

test('MetricsService Prometheus exposition formatting', async (t) => {
  const metrics = new MetricsService();

  await t.test('should record HTTP requests and export valid Prometheus counters and histograms', () => {
    metrics.recordHttpRequest('GET', '/api/campaigns', 200, 0.045);
    metrics.recordHttpRequest('GET', '/api/campaigns', 200, 0.012);
    metrics.recordHttpRequest('POST', '/api/evidence/upload', 201, 0.120);

    const output = metrics.generateExpositionText();

    assert.ok(output.includes('# HELP bestcrow_http_requests_total'), 'Must include help text');
    assert.ok(output.includes('# TYPE bestcrow_http_requests_total counter'), 'Must declare counter type');
    assert.ok(
      output.includes('bestcrow_http_requests_total{method="GET",route="/api/campaigns",status="200"} 2'),
      'Must count 2 GET requests'
    );
    assert.ok(
      output.includes('bestcrow_http_requests_total{method="POST",route="/api/evidence/upload",status="201"} 1'),
      'Must count 1 POST request'
    );

    assert.ok(output.includes('# TYPE bestcrow_http_request_duration_seconds histogram'));
    assert.ok(output.includes('bestcrow_http_request_duration_seconds_count{method="GET",route="/api/campaigns"} 2'));
  });

  await t.test('should track gauges and RPC counters accurately', () => {
    metrics.setActiveCampaigns(14);
    metrics.setActiveBackers(342);
    metrics.setSseConnections(8);
    metrics.recordRpcRequest('https://api.devnet.solana.com', 'success');
    metrics.recordRpcRequest('https://api.devnet.solana.com', 'failure');
    metrics.recordRpcFailover();

    const output = metrics.generateExpositionText();

    assert.ok(output.includes('bestcrow_active_campaigns_count 14'));
    assert.ok(output.includes('bestcrow_active_backers_count 342'));
    assert.ok(output.includes('bestcrow_sse_active_connections 8'));
    assert.ok(output.includes('bestcrow_rpc_failover_total 1'));
    assert.ok(output.includes('bestcrow_rpc_requests_total{endpoint="https://api.devnet.solana.com",status="success"} 1'));
    assert.ok(output.includes('bestcrow_rpc_requests_total{endpoint="https://api.devnet.solana.com",status="failure"} 1'));
  });

  await t.test('should export process uptime and resident memory metrics', () => {
    const output = metrics.generateExpositionText();
    assert.ok(output.includes('process_uptime_seconds'));
    assert.ok(output.includes('process_resident_memory_bytes'));
  });
});
