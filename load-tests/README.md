# Filmera load tests

These tests measure the backend's HTTP latency, WebSocket capacity, and room broadcast latency. They target `http://127.0.0.1:3000` by default and refuse remote targets unless `ALLOW_REMOTE_LOAD_TEST=true` is explicitly set.

## Toolchain

The repository uses Node 24.18.0 and pnpm 11.13.0. With `nvm` installed:

```bash
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm run typecheck
```

Install k6 on macOS with `brew install k6`. k6 is a standalone load generator and is intentionally not an npm dependency.

## Start the instrumented local backend

The load-test metrics endpoint is disabled unless explicitly enabled. Run the backend without MongoDB to use isolated in-memory data:

```bash
LOAD_TEST_METRICS=true \
LOAD_TEST_METRICS_TOKEN=local-metrics \
MONGODB_URI= \
JWT_SECRET=load-test-only \
PORT=3000 \
pnpm run start:backend
```

Verify it in another terminal:

```bash
curl http://127.0.0.1:3000/health
curl -H 'Authorization: Bearer local-metrics' http://127.0.0.1:3000/load-test/metrics
```

The metrics response includes RSS and heap memory, cumulative CPU time, event-loop delay p95/p99/max, active WebSocket connections and rooms, and connection/message counters. Capture it immediately before and after each run; CPU cost is the difference between the cumulative values.

## Test sequence

Run the smaller tests first:

```bash
pnpm run load:health
pnpm run load:rest
WS_VUS=10 pnpm run load:websocket
BROADCAST_VUS=10 BROADCAST_ITERATIONS=10 pnpm run load:broadcast
```

Increase WebSocket concurrency only after the prior level passes:

```bash
WS_VUS=50 pnpm run load:websocket
WS_VUS=100 pnpm run load:websocket
WS_VUS=250 pnpm run load:websocket
WS_VUS=500 pnpm run load:websocket
```

Useful overrides:

- `BASE_URL`: HTTP origin, default `http://127.0.0.1:3000`.
- `WS_URL`: WebSocket origin, derived from `BASE_URL` by default.
- `WS_VUS`: peak concurrent socket users, default 100.
- `WS_HOLD_MS`: how long each socket stays open, default 30000.
- `BROADCAST_VUS` and `BROADCAST_ITERATIONS`: broadcast concurrency and total iterations.
- `ALLOW_REMOTE_LOAD_TEST=true`: allows an authorized remote staging target. Never use this against production without owner and provider approval.

Example for authorized staging:

```bash
ALLOW_REMOTE_LOAD_TEST=true \
BASE_URL=https://staging.example.com \
WS_URL=wss://staging.example.com \
WS_VUS=50 \
pnpm run load:websocket
```

## Acceptance criteria

The scripts enforce these initial service-level objectives:

| Metric | Target |
| --- | ---: |
| HTTP failures | below 1% |
| HTTP p95 | below 500 ms |
| Successful checks | above 99% |
| WebSocket test errors | 0 |
| Lost broadcast messages | 0 |
| Broadcast latency p95 | below 250 ms |
| Client reconnection ceiling | 5 seconds (verified by application logic) |

Record p50, p90, p95 and p99, throughput, failures, memory delta, CPU delta, event-loop delay and maximum stable connections. A threshold is a goal until a repeatable run proves it; do not publish it as an achieved result beforehand.

## Interpreting results

- If HTTP p95 rises while event-loop delay rises, the Node process is CPU/event-loop constrained.
- If HTTP p95 rises but event-loop delay remains low, inspect MongoDB and network latency.
- If connections fail while CPU is low, inspect file-descriptor, proxy and hosting connection limits.
- If the load generator reaches 100% CPU, distribute the test or reduce VUs; its latency results are no longer trustworthy.
- Run at least three identical trials and report the median result. Keep backend, database, region and test-generator specifications with every report.
