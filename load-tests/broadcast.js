import http from "k6/http";
import { check } from "k6";
import { WebSocket } from "k6/websockets";
import { Counter, Trend } from "k6/metrics";
import { BASE_URL, WS_URL, createTestContext } from "./helpers.js";

const received = new Counter("broadcast_messages_received");
const missed = new Counter("broadcast_messages_missed");
const latency = new Trend("broadcast_latency", true);

export const options = {
  vus: Number(__ENV.BROADCAST_VUS || 10),
  iterations: Number(__ENV.BROADCAST_ITERATIONS || 10),
  thresholds: {
    broadcast_messages_missed: ["count==0"],
    broadcast_latency: ["p(95)<250"],
    checks: ["rate>0.99"],
  },
};

export function setup() { return createTestContext("broadcast"); }

export default function (context) {
  const socket = new WebSocket(`${WS_URL}/rooms/${context.roomCode}/ws?token=${encodeURIComponent(context.token)}`);
  let triggeredAt = 0;
  let gotBroadcast = false;

  socket.onopen = () => {
    setTimeout(() => {
      triggeredAt = Date.now();
      const response = http.patch(
        `${BASE_URL}/rooms/${context.roomCode}/movies`,
        JSON.stringify({ movies: [context.movie] }),
        { headers: context.headers, tags: { operation: "broadcast_trigger" } },
      );
      check(response, { "broadcast trigger accepted": (r) => r.status === 200 });
    }, 250);
    setTimeout(() => {
      if (!gotBroadcast) missed.add(1);
      socket.close();
    }, 5000);
  };

  socket.onmessage = () => {
    if (!triggeredAt || gotBroadcast) return;
    gotBroadcast = true;
    received.add(1);
    latency.add(Date.now() - triggeredAt);
    socket.close();
  };
  socket.onerror = () => missed.add(1);
}
