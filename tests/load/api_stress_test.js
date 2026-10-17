import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:4000';

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check latency is acceptable': (r) => r.timings.duration < 200,
  });

  const campaignsRes = http.get(`${BASE_URL}/api/campaigns`);
  check(campaignsRes, {
    'campaigns list status is 200': (r) => r.status === 200,
    'campaigns response has data': (r) => JSON.parse(r.body).success === true,
  });

  const statusRes = http.get(`${BASE_URL}/api/system/status`);
  check(statusRes, {
    'system status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
