import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, createTestContext, json } from "./helpers.js";

export const options = {
  scenarios: {
    room_flow: {
      executor: "ramping-vus",
      stages: [
        { duration: "15s", target: 10 },
        { duration: "30s", target: 50 },
        { duration: "15s", target: 100 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

export function setup() { return createTestContext("rest"); }

export default function (context) {
  const signin = http.post(`${BASE_URL}/signin`, JSON.stringify({ email: context.email, password: context.password }), {
    headers: { "Content-Type": "application/json" },
    tags: { operation: "signin" },
  });
  const token = json(signin).token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const room = http.post(`${BASE_URL}/rooms`, JSON.stringify({ movies: [context.movie] }), {
    headers,
    tags: { operation: "create_room" },
  });
  const roomCode = json(room).room?.code;
  const read = http.get(`${BASE_URL}/rooms/${roomCode}`, { headers, tags: { operation: "read_room" } });
  const swipe = http.post(`${BASE_URL}/swipes`, JSON.stringify({ roomCode, movieId: context.movie.id, liked: true }), {
    headers,
    tags: { operation: "swipe" },
  });

  check(signin, { "signin 200": (r) => r.status === 200 && Boolean(token) });
  check(room, { "room created": (r) => r.status === 201 && Boolean(roomCode) });
  check(read, { "room read": (r) => r.status === 200 });
  check(swipe, { "swipe accepted": (r) => r.status === 200 });
  sleep(1);
}
