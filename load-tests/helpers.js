import http from "k6/http";

export const BASE_URL = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
export const WS_URL = (__ENV.WS_URL || BASE_URL.replace(/^http/, "ws")).replace(/\/$/, "");

export function assertSafeTarget() {
  const local = /^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;
  if (!local.test(BASE_URL) && __ENV.ALLOW_REMOTE_LOAD_TEST !== "true") {
    throw new Error("Remote load tests are blocked. Set ALLOW_REMOTE_LOAD_TEST=true only for an authorized staging target.");
  }
}

export function json(response) {
  try {
    return response.json();
  } catch {
    return {};
  }
}

export function createTestContext(prefix = "load") {
  assertSafeTarget();
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${prefix}-${nonce}@example.test`;
  const password = "LoadTest!123";

  const signup = http.post(`${BASE_URL}/signup`, JSON.stringify({ name: "Load Test", email, password }), {
    headers: { "Content-Type": "application/json" },
  });
  if (signup.status !== 201) throw new Error(`Signup failed: ${signup.status} ${signup.body}`);

  const signin = http.post(`${BASE_URL}/signin`, JSON.stringify({ email, password }), {
    headers: { "Content-Type": "application/json" },
  });
  const token = json(signin).token;
  if (signin.status !== 200 || !token) throw new Error(`Signin failed: ${signin.status} ${signin.body}`);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const movie = { id: 278, tmdbId: 278, title: "The Shawshank Redemption", year: "1994", rating: "8.7" };
  const roomResponse = http.post(`${BASE_URL}/rooms`, JSON.stringify({ movies: [movie] }), { headers });
  const room = json(roomResponse).room;
  if (roomResponse.status !== 201 || !room?.code) throw new Error(`Room creation failed: ${roomResponse.status} ${roomResponse.body}`);

  return { email, password, token, roomCode: room.code, movie, headers };
}
