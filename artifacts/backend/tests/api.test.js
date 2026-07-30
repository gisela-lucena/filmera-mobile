import request from "supertest";

import { createApp, resetTestState } from "../src/server.js";

const app = createApp();
const movie = {
  id: 278,
  tmdbId: 278,
  title: "The Shawshank Redemption",
  year: "1994",
  rating: "8.7",
};

async function createUser(label) {
  const credentials = {
    name: `Test ${label}`,
    email: `${label}@example.test`,
    password: "Testing!123",
  };
  await request(app).post("/signup").send(credentials).expect(201);
  const signin = await request(app).post("/signin").send(credentials).expect(200);
  return {
    ...credentials,
    token: signin.body.token,
    authorization: { Authorization: `Bearer ${signin.body.token}` },
  };
}

beforeEach(() => resetTestState());

describe("authentication API", () => {
  test("signs up, signs in and returns the authenticated profile", async () => {
    const credentials = {
      name: "Gisela",
      email: "gisela@example.test",
      password: "Testing!123",
    };

    const signup = await request(app).post("/signup").send(credentials).expect(201);
    expect(signup.body.user).toMatchObject({ name: "Gisela", email: credentials.email });
    expect(signup.body.user).not.toHaveProperty("passwordHash");

    const signin = await request(app).post("/signin").send(credentials).expect(200);
    expect(signin.body.token).toEqual(expect.any(String));

    const profile = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${signin.body.token}`)
      .expect(200);
    expect(profile.body.user.email).toBe(credentials.email);
  });

  test("rejects invalid registration and authentication", async () => {
    await request(app)
      .post("/signup")
      .send({ name: "Short", email: "short@example.test", password: "123" })
      .expect(400);

    const user = await createUser("auth-rejection");
    await request(app).post("/signup").send(user).expect(409);
    await request(app)
      .post("/signin")
      .send({ email: user.email, password: "WrongPassword!" })
      .expect(401);
    await request(app).get("/users/me").expect(401);
  });
});

describe("rooms API", () => {
  test("creates, joins and reads a room", async () => {
    const host = await createUser("room-host");
    const guest = await createUser("room-guest");

    const created = await request(app)
      .post("/rooms")
      .set(host.authorization)
      .send({ movies: [movie] })
      .expect(201);
    const roomCode = created.body.room.code;
    expect(roomCode).toMatch(/^[A-F0-9]{6}$/);
    expect(created.body.room.participants).toHaveLength(1);

    const joined = await request(app)
      .post(`/rooms/${roomCode}/join`)
      .set(guest.authorization)
      .expect(200);
    expect(joined.body.room.participants).toHaveLength(2);

    const read = await request(app)
      .get(`/rooms/${roomCode}`)
      .set(host.authorization)
      .expect(200);
    expect(read.body.room).toMatchObject({ code: roomCode, matchedMovie: null });
    expect(read.body.room.movies[0].title).toBe(movie.title);
  });

  test("requires authentication and rejects unknown rooms", async () => {
    await request(app).post("/rooms").send({ movies: [movie] }).expect(401);
    const user = await createUser("missing-room");
    await request(app)
      .get("/rooms/FFFFFF")
      .set(user.authorization)
      .expect(404);
  });
});

describe("swipes and unanimous match rule", () => {
  test("creates a match only after every participant likes the movie", async () => {
    const host = await createUser("match-host");
    const guest = await createUser("match-guest");
    const created = await request(app)
      .post("/rooms")
      .set(host.authorization)
      .send({ movies: [movie] })
      .expect(201);
    const roomCode = created.body.room.code;
    await request(app)
      .post(`/rooms/${roomCode}/join`)
      .set(guest.authorization)
      .expect(200);

    const firstLike = await request(app)
      .post("/swipes")
      .set(host.authorization)
      .send({ roomCode, movieId: movie.id, liked: true })
      .expect(200);
    expect(firstLike.body.match).toBeUndefined();

    const unanimousLike = await request(app)
      .post("/swipes")
      .set(guest.authorization)
      .send({ roomCode, movieId: movie.id, liked: true })
      .expect(200);
    expect(unanimousLike.body.match).toMatchObject({ id: movie.id, title: movie.title });
  });

  test("does not match when one participant passes", async () => {
    const host = await createUser("pass-host");
    const guest = await createUser("pass-guest");
    const created = await request(app)
      .post("/rooms")
      .set(host.authorization)
      .send({ movies: [movie] })
      .expect(201);
    const roomCode = created.body.room.code;
    await request(app).post(`/rooms/${roomCode}/join`).set(guest.authorization).expect(200);

    await request(app)
      .post("/swipes")
      .set(host.authorization)
      .send({ roomCode, movieId: movie.id, liked: true })
      .expect(200);
    await request(app)
      .post("/swipes")
      .set(guest.authorization)
      .send({ roomCode, movieId: movie.id, liked: false })
      .expect(200);

    const room = await request(app)
      .get(`/rooms/${roomCode}`)
      .set(host.authorization)
      .expect(200);
    expect(room.body.room.matchedMovie).toBeNull();
  });

  test("validates swipe input", async () => {
    const user = await createUser("invalid-swipe");
    await request(app)
      .post("/swipes")
      .set(user.authorization)
      .send({ movieId: movie.id, liked: true })
      .expect(400);
    await request(app)
      .post("/swipes")
      .set(user.authorization)
      .send({ roomCode: "ABC123", liked: true })
      .expect(400);
  });
});
