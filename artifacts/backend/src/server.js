import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import http from "node:http";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-filmera-secret-change-me";
const MONGODB_URI = process.env.MONGODB_URI || "";
const API_PREFIX = "/api/filmera";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_URL =
  process.env.PASSWORD_RESET_URL || "filmera://reset-password";
const EXPO_GO_RESET_URL = process.env.EXPO_GO_RESET_URL || "";
const PUBLIC_BACKEND_URL = (
  process.env.PUBLIC_BACKEND_URL || "https://filmera-mobile.onrender.com"
).replace(/\/$/, "");
const RESEND_API_URL =
  process.env.RESEND_API_URL || "https://api.resend.com/emails";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const fallbackMovies = [
  {
    id: 278,
    tmdbId: 278,
    title: "The Shawshank Redemption",
    year: "1994",
    rating: "8.7",
    overview:
      "Two imprisoned men bond over years, finding solace and eventual redemption.",
    poster: "https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
  },
  {
    id: 238,
    tmdbId: 238,
    title: "The Godfather",
    year: "1972",
    rating: "8.7",
    overview:
      "The aging patriarch of an organized crime dynasty transfers control to his son.",
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  },
  {
    id: 155,
    tmdbId: 155,
    title: "The Dark Knight",
    year: "2008",
    rating: "8.5",
    overview:
      "Batman faces a criminal mastermind who plunges Gotham into chaos.",
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  },
  {
    id: 680,
    tmdbId: 680,
    title: "Pulp Fiction",
    year: "1994",
    rating: "8.5",
    overview:
      "Interwoven stories of crime and consequence unfold in Los Angeles.",
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  },
  {
    id: 13,
    tmdbId: 13,
    title: "Forrest Gump",
    year: "1994",
    rating: "8.5",
    overview:
      "A kindhearted man witnesses and influences defining moments in American history.",
    poster: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
  },
];

const memory = {
  users: [],
  rooms: [],
  swipes: [],
};

const movieSchema = new mongoose.Schema(
  {
    id: Number,
    tmdbId: Number,
    title: String,
    year: String,
    rating: String,
    genre: String,
    overview: String,
    poster: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    movies: [movieSchema],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    matchedMovie: movieSchema,
  },
  { timestamps: true },
);

const swipeSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: { type: Number, required: true },
    liked: { type: Boolean, required: true },
  },
  { timestamps: true },
);

swipeSchema.index({ roomCode: 1, userId: 1, movieId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
const Room = mongoose.model("Room", roomSchema);
const Swipe = mongoose.model("Swipe", swipeSchema);

let mongoReady = false;

function publicUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

function normalizeMovie(movie) {
  return {
    id: movie.tmdbId ?? movie.id,
    tmdbId: movie.tmdbId ?? movie.id,
    title: movie.title,
    year: String(movie.year ?? ""),
    rating: String(movie.rating ?? ""),
    genre: movie.genre ?? "",
    overview: movie.overview ?? "",
    poster: movie.poster ?? "",
  };
}

function publicRoom(room) {
  return {
    _id: String(room._id),
    code: room.code,
    movies: (room.movies || []).map(normalizeMovie),
    participants: (room.participants || []).map(String),
    matchedMovie: room.matchedMovie ? normalizeMovie(room.matchedMovie) : null,
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: "30d" });
}

function createPasswordResetUrl(resetToken) {
  const url = new URL(`${PUBLIC_BACKEND_URL}/open-reset-password`);
  url.searchParams.set("token", resetToken);
  return url.toString();
}

function createPasswordResetDeepLink(resetToken) {
  const url = new URL(PASSWORD_RESET_URL);
  url.searchParams.set("token", resetToken);
  return url.toString();
}

function createExpoGoResetLink(resetToken) {
  if (!EXPO_GO_RESET_URL) return "";
  const url = new URL(EXPO_GO_RESET_URL);
  url.searchParams.set("token", resetToken);
  return url.toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function sendPasswordResetEmail({ email, resetToken }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SMTP_FROM;

  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured");
  }

  const resetUrl = createPasswordResetUrl(resetToken);
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Reset your FILMERA password",
      text: [
        "We received a request to reset your FILMERA password.",
        "",
        `Open this link to create a new password: ${resetUrl}`,
        "",
        "This link expires in 1 hour. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: [
        "<p>We received a request to reset your FILMERA password.</p>",
        `<p><a href="${resetUrl}">Reset your password</a></p>`,
        "<p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data?.message ||
        `Password reset email failed with status ${response.status}`,
    );
  }
}

function readBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice("Bearer ".length);
}

async function findUserById(id) {
  if (mongoReady) return User.findById(id);
  return memory.users.find((user) => String(user._id) === String(id)) || null;
}

async function requireUser(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) return res.status(401).json({ message: "Missing token" });

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid token" });

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

async function findRoomByCode(code) {
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();
  if (mongoReady) return Room.findOne({ code: normalizedCode });
  return memory.rooms.find((room) => room.code === normalizedCode) || null;
}

async function saveRoom(room) {
  if (mongoReady) return room.save();
  const index = memory.rooms.findIndex(
    (item) => String(item._id) === String(room._id),
  );
  if (index >= 0) memory.rooms[index] = room;
  else memory.rooms.push(room);
  return room;
}

const socketsByRoom = new Map();

function sendJson(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function broadcastRoom(room) {
  const message = { type: "room:update", room: publicRoom(room) };
  const sockets = socketsByRoom.get(room.code);
  if (!sockets) return;
  for (const socket of sockets) sendJson(socket, message);
}

function broadcastMatch(room, movie) {
  const sockets = socketsByRoom.get(room.code);
  if (!sockets) return;
  for (const socket of sockets) {
    sendJson(socket, {
      type: "match:created",
      matchedMovie: normalizeMovie(movie),
      room: publicRoom(room),
    });
  }
}

function createRoomCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

function createMemoryId() {
  return crypto.randomUUID();
}

async function addParticipant(room, userId) {
  const id = String(userId);
  const participants = (room.participants || []).map(String);
  if (!participants.includes(id)) {
    room.participants = [...(room.participants || []), userId];
    await saveRoom(room);
  }
  return room;
}

async function findMatch(roomCode, movieId, currentUserId) {
  if (mongoReady) {
    return Swipe.findOne({
      roomCode,
      movieId,
      liked: true,
      userId: { $ne: currentUserId },
    });
  }

  return memory.swipes.find(
    (swipe) =>
      swipe.roomCode === roomCode &&
      swipe.movieId === movieId &&
      swipe.liked &&
      String(swipe.userId) !== String(currentUserId),
  );
}

async function upsertSwipe({ roomCode, userId, movieId, liked }) {
  if (mongoReady) {
    return Swipe.findOneAndUpdate(
      { roomCode, userId, movieId },
      { roomCode, userId, movieId, liked },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const index = memory.swipes.findIndex(
    (swipe) =>
      swipe.roomCode === roomCode &&
      String(swipe.userId) === String(userId) &&
      swipe.movieId === movieId,
  );

  const swipe = { _id: createMemoryId(), roomCode, userId, movieId, liked };
  if (index >= 0) memory.swipes[index] = { ...memory.swipes[index], liked };
  else memory.swipes.push(swipe);
  return swipe;
}

async function authenticateSocket(req) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return findUserById(payload.sub);
  } catch {
    return null;
  }
}

function createRouter() {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, database: mongoReady ? "mongodb" : "memory" });
  });

  router.get("/open-reset-password", (req, res) => {
    const token = String(req.query?.token || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).send("Invalid password reset link.");
    }

    const deepLink = createPasswordResetDeepLink(token);
    const expoGoLink = createExpoGoResetLink(token);
    const safeDeepLink = escapeHtml(deepLink);
    const safeExpoGoLink = escapeHtml(expoGoLink);
    const expoGoButton = expoGoLink
      ? `<a class="secondary" href="${safeExpoGoLink}">Open in Expo Go</a>`
      : "";
    return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Open FILMERA</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: #0e051a; color: #fdfbef; font-family: system-ui, sans-serif; text-align: center; }
      main { width: min(100%, 420px); padding: 32px 24px; border: 1px solid rgba(255,255,255,.14); border-radius: 24px; background: #1e0f35; }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0 0 24px; color: #b8a8cc; line-height: 1.5; }
      a { display: block; padding: 16px; border-radius: 14px; background: #ffd600; color: #17092a; font-weight: 800; text-decoration: none; }
      a + a { margin-top: 12px; }
      a.secondary { border: 1px solid rgba(255,255,255,.22); background: transparent; color: #fdfbef; }
    </style>
  </head>
  <body>
    <main>
      <h1>Open FILMERA</h1>
      <p>Continue in the app to create your new password.</p>
      <a href="${safeDeepLink}">Open FILMERA</a>
      ${expoGoButton}
    </main>
  </body>
</html>`);
  });

  router.post("/signup", async (req, res, next) => {
    try {
      const name = String(req.body?.name || "").trim();
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || "");

      if (!name) return res.status(400).json({ message: "Name is required" });
      if (!email) return res.status(400).json({ message: "Email is required" });
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters" });
      }

      const existing = mongoReady
        ? await User.findOne({ email })
        : memory.users.find((user) => user.email === email);
      if (existing)
        return res.status(409).json({ message: "Email already registered" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = mongoReady
        ? await User.create({ name, email, passwordHash })
        : { _id: createMemoryId(), name, email, passwordHash };

      if (!mongoReady) memory.users.push(user);
      return res
        .status(201)
        .json({ message: "User created", user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/signin", async (req, res, next) => {
    try {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || "");
      const user = mongoReady
        ? await User.findOne({ email })
        : memory.users.find((item) => item.email === email);

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      return res.json({ token: signToken(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/forgot-password", async (req, res, next) => {
    const response = {
      message:
        "If this email is registered, we will send password reset instructions.",
    };

    try {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }

      const user = mongoReady
        ? await User.findOne({ email }).select(
            "+passwordResetToken +passwordResetExpires",
          )
        : memory.users.find((item) => item.email === email);
      if (!user) return res.json(response);

      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      if (mongoReady) await user.save({ validateBeforeSave: false });

      try {
        await sendPasswordResetEmail({ email: user.email, resetToken });
      } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        if (mongoReady) await user.save({ validateBeforeSave: false });
        throw error;
      }

      return res.json(response);
    } catch (error) {
      return next(error);
    }
  });

  router.post("/reset-password", async (req, res, next) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");

      if (!/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(400).json({ message: "Reset link is invalid" });
      }
      if (password.length < 8 || password.length > 70) {
        return res.status(400).json({
          message: "Password must be between 8 and 70 characters",
        });
      }

      const passwordResetToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
      const now = new Date();
      const user = mongoReady
        ? await User.findOne({
            passwordResetToken,
            passwordResetExpires: { $gt: now },
          }).select("+passwordResetToken +passwordResetExpires")
        : memory.users.find(
            (item) =>
              item.passwordResetToken === passwordResetToken &&
              item.passwordResetExpires > now,
          );

      if (!user) {
        return res
          .status(400)
          .json({ message: "Reset link is invalid or expired" });
      }

      user.passwordHash = await bcrypt.hash(password, 10);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      if (mongoReady) await user.save();

      return res.json({ message: "Password reset successfully" });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/users/me", requireUser, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  router.get("/movies", (_req, res) => {
    res.json({ movies: fallbackMovies });
  });

  router.post("/rooms", requireUser, async (req, res, next) => {
    try {
      const movies = Array.isArray(req.body?.movies)
        ? req.body.movies.map(normalizeMovie)
        : [];
      if (movies.length === 0)
        return res.status(400).json({ message: "Movies are required" });

      let code = String(req.body?.code || "")
        .trim()
        .toUpperCase();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        code = code || createRoomCode();
        if (!(await findRoomByCode(code))) break;
        code = "";
      }

      const room = mongoReady
        ? await Room.create({
            code,
            movies,
            participants: [req.user._id],
            matchedMovie: null,
          })
        : {
            _id: createMemoryId(),
            code,
            movies,
            participants: [req.user._id],
            matchedMovie: null,
          };

      if (!mongoReady) memory.rooms.push(room);
      broadcastRoom(room);
      return res.status(201).json({ room: publicRoom(room) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/rooms/:roomCode/join", requireUser, async (req, res, next) => {
    try {
      const room = await findRoomByCode(req.params.roomCode);
      if (!room) return res.status(404).json({ message: "Room not found" });

      await addParticipant(room, req.user._id);
      broadcastRoom(room);
      return res.json({ room: publicRoom(room) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/rooms/:roomCode", requireUser, async (req, res, next) => {
    try {
      const room = await findRoomByCode(req.params.roomCode);
      if (!room) return res.status(404).json({ message: "Room not found" });

      return res.json({ room: publicRoom(room) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/rooms/:roomCode/match/clear", requireUser, async (req, res, next) => {
    try {
      const room = await findRoomByCode(req.params.roomCode);
      if (!room) return res.status(404).json({ message: "Room not found" });

      room.matchedMovie = null;
      await saveRoom(room);
      broadcastRoom(room);
      return res.json({ room: publicRoom(room) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/swipes", requireUser, async (req, res, next) => {
    try {
      const roomCode = String(req.body?.roomCode || req.body?.roomId || "")
        .trim()
        .toUpperCase();
      const movieId = Number(req.body?.movieId);
      const liked = Boolean(req.body?.liked);

      if (!roomCode)
        return res.status(400).json({ message: "roomCode is required" });
      if (!Number.isFinite(movieId))
        return res.status(400).json({ message: "movieId is required" });

      const room = await findRoomByCode(roomCode);
      if (!room) return res.status(404).json({ message: "Room not found" });

      await addParticipant(room, req.user._id);
      await upsertSwipe({ roomCode, userId: req.user._id, movieId, liked });

      if (liked && !room.matchedMovie) {
        const match = await findMatch(roomCode, movieId, req.user._id);
        if (match) {
          const movie = (room.movies || []).find(
            (item) => Number(item.tmdbId ?? item.id) === movieId,
          );
          if (movie) {
            room.matchedMovie = normalizeMovie(movie);
            await saveRoom(room);
            broadcastMatch(room, movie);
            return res.json({
              match: normalizeMovie(movie),
              room: publicRoom(room),
            });
          }
        }
      }

      broadcastRoom(room);
      return res.json({});
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

async function start() {
  if (MONGODB_URI) {
    await mongoose.connect(MONGODB_URI);
    mongoReady = true;
    console.log("Connected to MongoDB");
  } else {
    console.warn("MONGODB_URI is not set. Using in-memory storage.");
  }

  const app = express();
  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.includes("*") ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  const router = createRouter();
  app.use("/", router);
  app.use(API_PREFIX, router);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (socket, req, context) => {
    const { roomCode, user } = context;
    const room = await findRoomByCode(roomCode);

    if (!room) {
      socket.close(1008, "Room not found");
      return;
    }

    await addParticipant(room, user._id);

    const sockets = socketsByRoom.get(room.code) || new Set();
    sockets.add(socket);
    socketsByRoom.set(room.code, sockets);

    sendJson(socket, { type: "room:update", room: publicRoom(room) });
    broadcastRoom(room);

    socket.on("close", () => {
      sockets.delete(socket);
      if (sockets.size === 0) socketsByRoom.delete(room.code);
    });
  });

  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const match = url.pathname.match(
      /^(?:\/api\/filmera)?\/rooms\/([^/]+)\/ws$/,
    );

    if (!match) {
      socket.destroy();
      return;
    }

    const user = await authenticateSocket(req);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const roomCode = decodeURIComponent(match[1]).trim().toUpperCase();
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, { roomCode, user });
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Filmera backend listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
