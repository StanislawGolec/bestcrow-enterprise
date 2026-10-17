import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PrimaryFallbackRpcStrategy } from '../src/strategies/rpc_strategy.js';

describe('PrimaryFallbackRpcStrategy', () => {
  const primaryUrl = 'https://api.devnet.solana.com';
  const fallbackUrl = 'https://api.testnet.solana.com';

  test('should initially route traffic to the primary endpoint', () => {
    const strategy = new PrimaryFallbackRpcStrategy(primaryUrl, fallbackUrl);
    assert.equal(strategy.getActiveUrl(), primaryUrl);
  });

  test('should failover to fallback endpoint after consecutive failures', () => {
    const strategy = new PrimaryFallbackRpcStrategy(primaryUrl, fallbackUrl);
    assert.equal(strategy.getActiveUrl(), primaryUrl);

    strategy.reportFailure(primaryUrl, new Error('Rate limit exceeded (429)'));
    assert.equal(strategy.getActiveUrl(), primaryUrl);

    strategy.reportFailure(primaryUrl, new Error('Server error (503)'));
    assert.equal(strategy.getActiveUrl(), fallbackUrl);

    const status = strategy.getStatus();
    assert.equal(status.primary.isHealthy, false);
    assert.equal(status.primary.failureCount, 2);
    assert.equal(status.fallback.isHealthy, true);
  });

  test('should reset failure count upon successful request', () => {
    const strategy = new PrimaryFallbackRpcStrategy(primaryUrl, fallbackUrl);

    strategy.reportFailure(primaryUrl, new Error('Transient error'));
    assert.equal(strategy.getStatus().primary.failureCount, 1);

    strategy.reportSuccess(primaryUrl);
    assert.equal(strategy.getStatus().primary.failureCount, 0);
    assert.equal(strategy.getStatus().primary.isHealthy, true);
  });
});
