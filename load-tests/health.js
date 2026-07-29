import http from "k6/http";
import { check } from "k6";
import { BASE_URL, assertSafeTarget } from "./helpers.js";

export const options = {
  stages: [
    { duration: "15s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "15s", target: 100 },
    { duration: "15s", target: 0 },
  ],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"] },
};

export function setup() { assertSafeTarget(); }

export default function () {
  const response = http.get(`${BASE_URL}/health`);
  check(response, { "health returned 200": (result) => result.status === 200 });
}
