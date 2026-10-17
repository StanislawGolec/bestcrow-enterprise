import test from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/strategies/circuit_breaker.js';
import { PrimaryFallbackRpcStrategy } from '../src/strategies/rpc_strategy.js';
import { ExponentialBackoffRetry } from '../src/strategies/exponential_backoff_retry.js';
import { EventBroadcaster } from '../src/services/event_broadcaster.js';

test('CircuitBreaker adaptive state machine', async (t) => {
  await t.test('should remain CLOSED when operations succeed', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    const result = await cb.execute(async () => 'OK');
    assert.strictEqual(result, 'OK');
    assert.strictEqual(cb.getState(), 'CLOSED');
  });

  await t.test('should trip to OPEN after consecutive failures and fast-fail subsequent requests', async () => {
    let stateChanges: string[] = [];
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 100,
      onStateChange: (from, to) => stateChanges.push(`${from}->${to}`),
    });

    const failingOp = async () => {
      throw new Error('Downstream network timeout');
    };

    // 3 consecutive failures
    await assert.rejects(() => cb.execute(failingOp));
    await assert.rejects(() => cb.execute(failingOp));
    await assert.rejects(() => cb.execute(failingOp));

    assert.strictEqual(cb.getState(), 'OPEN');
    assert.ok(stateChanges.includes('CLOSED->OPEN'));

    // 4th request must immediately fast-fail with CircuitBreakerOpenError without invoking operation
    let operationInvoked = false;
    await assert.rejects(
      () =>
        cb.execute(async () => {
          operationInvoked = true;
          return 'NEVER';
        }),
      (err: unknown) => {
        return err instanceof CircuitBreakerOpenError;
      }
    );
    assert.strictEqual(operationInvoked, false, 'Downstream operation must not be called when circuit is OPEN');
  });

  await t.test('should probe in HALF_OPEN and recover to CLOSED on successful operations', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      resetTimeoutMs: 50,
    });

    // Trip circuit
    await assert.rejects(() => cb.execute(async () => { throw new Error('fail'); }));
    await assert.rejects(() => cb.execute(async () => { throw new Error('fail'); }));
    assert.strictEqual(cb.getState(), 'OPEN');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.strictEqual(cb.getState(), 'HALF_OPEN');

    // First recovery probe succeeds
    const res1 = await cb.execute(async () => 'probe_1');
    assert.strictEqual(res1, 'probe_1');
    assert.strictEqual(cb.getState(), 'HALF_OPEN');

    // Second recovery probe succeeds -> restores CLOSED
    const res2 = await cb.execute(async () => 'probe_2');
    assert.strictEqual(res2, 'probe_2');
    assert.strictEqual(cb.getState(), 'CLOSED');
  });
});

test('Chaos Resilience Fault Injection Simulation', async (t) => {
  await t.test('should achieve 100% eventual success under 15% random packet drops and 429 rate limits', async () => {
    const rpcStrategy = new PrimaryFallbackRpcStrategy(
      'https://primary.rpc.local',
      'https://fallback.rpc.local'
    );
    const retryPolicy = new ExponentialBackoffRetry({
      maxAttempts: 4,
      initialDelayMs: 5,
      maxDelayMs: 25,
      backoffFactor: 1.5,
    });

    // Seed pseudo-random generator for deterministic chaos testing
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    let totalCalls = 0;
    let droppedCalls = 0;
    let rateLimitedCalls = 0;
    let successfulOperations = 0;

    for (let i = 0; i < 100; i++) {
      const opResult = await retryPolicy.execute(async () => {
        totalCalls += 1;
        const target = rpcStrategy.getActiveUrl();
        const rand = pseudoRandom();

        // 15% simulated packet drop (network error)
        if (rand < 0.15) {
          droppedCalls += 1;
          const err = new Error('ECONNRESET: simulated packet drop');
          rpcStrategy.reportFailure(target, err);
          throw err;
        }

        // 5% simulated HTTP 429 Too Many Requests
        if (rand < 0.20) {
          rateLimitedCalls += 1;
          const err = new Error('HTTP 429: Too Many Requests');
          rpcStrategy.reportFailure(target, err);
          throw err;
        }

        rpcStrategy.reportSuccess(target);
        return `confirmed_slot_${i}`;
      });

      assert.strictEqual(opResult, `confirmed_slot_${i}`);
      successfulOperations += 1;
    }

    assert.strictEqual(successfulOperations, 100, 'All 100 operations must eventually succeed via retry/failover');
    assert.ok(droppedCalls > 0, 'Chaos harness must have injected simulated packet drops');
    assert.ok(rateLimitedCalls > 0, 'Chaos harness must have injected simulated rate limits');
  });
});

test('Resource Leak & Event Listener Lifecycle Audit', async (t) => {
  await t.test('should maintain bounded listener count under repeated client disconnects', () => {
    const broadcaster = new EventBroadcaster();

    const unsubscribers: Array<() => void> = [];
    for (let i = 0; i < 50; i++) {
      const sub = broadcaster.subscribe('campaign_leak_test', () => {});
      unsubscribers.push(sub.unsubscribe);
    }

    assert.strictEqual(broadcaster.getSubscriberCount('campaign_leak_test'), 50);

    // Clean up all subscribers
    for (const unsub of unsubscribers) {
      unsub();
    }

    assert.strictEqual(
      broadcaster.getSubscriberCount('campaign_leak_test'),
      0,
      'Subscriber count must return to 0 after lifecycle cleanup'
    );
  });
});
