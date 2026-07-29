import { check } from "k6";
import { WebSocket } from "k6/websockets";
import { Counter } from "k6/metrics";
import { WS_URL, createTestContext } from "./helpers.js";

const opened = new Counter("websocket_connections_opened");
const messages = new Counter("websocket_messages_received");
const errors = new Counter("websocket_errors");

const target = Number(__ENV.WS_VUS || 100);
export const options = {
  scenarios: {
    connections: {
      executor: "ramping-vus",
      stages: [
        { duration: "15s", target: Math.min(10, target) },
        { duration: "30s", target: Math.min(50, target) },
        { duration: "30s", target },
        { duration: "15s", target: 0 },
      ],
      gracefulStop: "10s",
    },
  },
  thresholds: { websocket_errors: ["count==0"], websocket_connections_opened: ["count>0"] },
};

export function setup() { return createTestContext("ws"); }

export default function (context) {
  const socket = new WebSocket(`${WS_URL}/rooms/${context.roomCode}/ws?token=${encodeURIComponent(context.token)}`);
  socket.onopen = () => {
    opened.add(1);
    check(true, { "WebSocket connected": () => true });
    setTimeout(() => socket.close(), Number(__ENV.WS_HOLD_MS || 30000));
  };
  socket.onmessage = () => messages.add(1);
  socket.onerror = () => errors.add(1);
}
