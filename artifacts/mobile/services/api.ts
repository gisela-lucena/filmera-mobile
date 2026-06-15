import Constants from "expo-constants";
import { Platform } from "react-native";

// Provide a minimal "process.env" typing for environments without @types/node
declare const process: { env: { [key: string]: string | undefined } };

function requireSecureNativeOrigin(origin: string, label: string): string {
  const normalized = origin.replace(/\/$/, "");

  if (Platform.OS !== "web" && !normalized.startsWith("https://")) {
    throw new Error(`${label} must use HTTPS in the mobile app`);
  }

  return normalized;
}

// Web can use the local API proxy. Native apps cannot use a relative /api URL,
// so the iOS/Android preview talks directly to the deployed backend.
const DOMAIN = process.env["EXPO_PUBLIC_DOMAIN"] ?? "";
const API_ORIGIN = requireSecureNativeOrigin(
  process.env["EXPO_PUBLIC_API_URL"] ??
    "https://filmera-mobile.onrender.com",
  "EXPO_PUBLIC_API_URL",
);
const BASE_URL = DOMAIN
  ? `https://${DOMAIN}/api/filmera`
  : Platform.OS === "web"
    ? "/api/filmera"
    : API_ORIGIN;

const g = globalThis as typeof globalThis & { _filmeraToken?: string | null };

export function getToken(): string | null {
  return g._filmeraToken ?? null;
}

export function setToken(token: string) {
  g._filmeraToken = token;
}

export function clearToken() {
  g._filmeraToken = null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const preview = text.trim().slice(0, 80);
      throw new Error(
        `Expected JSON from API but received ${res.status} ${res.statusText}: ${preview}`,
      );
    }
  }

  if (res.ok) return data as T;

  const validationMessage = data?.validation?.body?.message;
  throw new Error(validationMessage || data?.message || `Error ${res.status}`);
}

function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  }).then((res) => handleResponse<T>(res));
}

export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Movie {
  id: number;
  tmdbId?: number;
  title: string;
  year: string;
  rating: string;
  genre?: string;
  overview: string;
  poster: string;
}

export interface Room {
  _id: string;
  code: string;
  movies: Movie[];
  participants: string[];
  matchedMovie?: Movie | null;
}

export function normalizeMovies(movies: any[]): Movie[] {
  return (movies ?? []).map((m) => ({
    id: m.tmdbId ?? m.id,
    tmdbId: m.tmdbId ?? m.id,
    title: m.title,
    year: String(m.year ?? ""),
    rating: String(m.rating ?? ""),
    overview: m.overview ?? "",
    poster: m.poster ?? "",
  }));
}

export function normalizeRoom(data: any): Room {
  const r = data?.room ?? data;
  return {
    _id: r._id,
    code: r.code,
    movies: normalizeMovies(r.movies ?? []),
    participants: r.participants ?? [],
    matchedMovie: r.matchedMovie ? normalizeMovies([r.matchedMovie])[0] : null,
  };
}

function getExtraConfigValue(key: string): string {
  const envValue = process.env[key];
  const extraValue = Constants.expoConfig?.extra?.[key];

  if (typeof envValue === "string" && envValue.length > 0) return envValue;
  if (typeof extraValue === "string" && extraValue.length > 0)
    return extraValue;

  return "";
}

function toWebSocketOrigin(origin: string): string {
  const normalized = origin
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:")
    .replace(/\/$/, "");

  if (Platform.OS !== "web" && !normalized.startsWith("wss://")) {
    throw new Error("EXPO_PUBLIC_WS_URL must use WSS in the mobile app");
  }

  return normalized;
}

export function getRealtimeUrl(path: string): string {
  const wsOrigin = getExtraConfigValue("EXPO_PUBLIC_WS_URL");
  const token = getToken();
  let origin = wsOrigin ? toWebSocketOrigin(wsOrigin) : "";

  if (!origin) {
    if (DOMAIN) {
      origin = `wss://${DOMAIN}/api/filmera`;
    } else if (Platform.OS === "web") {
      const location = globalThis.location;
      const protocol = location?.protocol === "https:" ? "wss:" : "ws:";
      origin = `${protocol}//${location?.host ?? ""}${BASE_URL}`;
    } else {
      origin = toWebSocketOrigin(API_ORIGIN);
    }
  }

  const url = new URL(`${origin}${path}`);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export const api = {
  warmup(): Promise<void> {
    return request<{ ok: boolean }>("/health").then(() => undefined);
  },

  signup(body: { name: string; email: string; password: string }) {
    return request<{ message: string; user: User }>("/signup", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        email: body.email.trim().toLowerCase(),
      }),
    });
  },

  async signin(body: { email: string; password: string }): Promise<User> {
    const data = await request<{ token: string; user?: User }>("/signin", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        email: body.email.trim().toLowerCase(),
      }),
    });
    setToken(data.token);
    return data.user ?? api.getCurrentUser();
  },

  forgotPassword(body: { email: string }) {
    return request<{ message: string }>("/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        email: body.email.trim().toLowerCase(),
      }),
    });
  },

  resetPassword(body: { token: string; password: string }) {
    return request<{ message: string }>("/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getCurrentUser(): Promise<User> {
    return request<any>("/users/me").then((d) => d?.user ?? d);
  },

  deleteAccount(): Promise<{ message: string }> {
    return request<{ message: string }>("/users/me", {
      method: "DELETE",
    });
  },

  async createRoom(movies: Movie[]): Promise<Room> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const payload = {
      code,
      movies: movies.map((m) => ({
        tmdbId: m.tmdbId ?? m.id,
        title: m.title,
        year: m.year,
        rating: m.rating,
        overview: m.overview,
        poster: m.poster,
      })),
    };
    const data = await request<any>("/rooms", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeRoom(data);
  },

  async joinRoom(roomCode: string): Promise<Room> {
    const data = await request<any>(`/rooms/${roomCode}/join`, {
      method: "POST",
    });
    return normalizeRoom(data);
  },

  async getRoom(roomCode: string): Promise<Room> {
    const data = await request<any>(`/rooms/${roomCode}`);
    return normalizeRoom(data);
  },

  async clearMatch(roomCode: string): Promise<Room> {
    const data = await request<any>(`/rooms/${roomCode}/match/clear`, {
      method: "PATCH",
    });
    return normalizeRoom(data);
  },

  async createSwipe(body: {
    roomCode: string;
    movie: Movie;
    liked: boolean;
  }): Promise<{ match?: Movie }> {
    const data = await request<any>("/swipes", {
      method: "POST",
      body: JSON.stringify({
        roomCode: body.roomCode,
        movieId: body.movie.tmdbId ?? body.movie.id,
        liked: body.liked,
      }),
    });
    const match = data?.match ?? data?.matchedMovie;
    if (match) {
      return { match: normalizeMovies([match])[0] };
    }
    return {};
  },
};

export interface FilterOptions {
  genres?: number[]; // TMDB genre IDs
  year?: string; // Exact release year e.g. "2024"
  sort?: string; // TMDB sort_by value e.g. "popularity.desc"
}

const WATCH_REGION = "US";
const WATCH_PROVIDER_KEYS = ["flatrate", "rent", "buy", "ads", "free"];
const TMDB_MOVIE_PAGE_COUNT = 5;

function getTmdbToken(): string {
  const envToken = process.env["EXPO_PUBLIC_TMDB_TOKEN"];
  const extraToken = Constants.expoConfig?.extra?.["EXPO_PUBLIC_TMDB_TOKEN"];

  if (typeof envToken === "string" && envToken.length > 0) return envToken;
  if (typeof extraToken === "string" && extraToken.length > 0)
    return extraToken;

  return "";
}

async function tmdbFetch<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

function normalizeTmdbMovie(movie: any): Movie {
  return {
    id: movie.id as number,
    tmdbId: movie.id as number,
    title: movie.title as string,
    year: (movie.release_date as string)?.slice(0, 4) ?? "",
    rating: String((movie.vote_average as number)?.toFixed(1) ?? ""),
    overview: (movie.overview as string) ?? "",
    poster: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path as string}`
      : "",
  };
}

async function hasWatchAvailability(
  movieId: number,
  token: string,
): Promise<boolean> {
  const data = await tmdbFetch<any>(`/movie/${movieId}/watch/providers`, token);
  const region = data?.results?.[WATCH_REGION];
  if (!region) return false;
  return WATCH_PROVIDER_KEYS.some(
    (key) => Array.isArray(region[key]) && region[key].length > 0,
  );
}

function sortMovies(movies: Movie[], sort = "popularity.desc"): Movie[] {
  const sorted = [...movies];

  if (sort === "vote_average.desc") {
    return sorted.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  if (sort === "release_date.desc") {
    return sorted.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  }

  return sorted;
}

async function filterByWatchAvailability(
  movies: Movie[],
  tmdbToken = getTmdbToken(),
): Promise<Movie[]> {
  if (!tmdbToken) return movies;

  const availability = await Promise.all(
    movies.map(async (movie) => ({
      movie,
      available: await hasWatchAvailability(
        movie.tmdbId ?? movie.id,
        tmdbToken,
      ),
    })),
  );

  return availability
    .filter(({ available }) => available)
    .map(({ movie }) => movie);
}

async function fetchTmdbMoviesWithFilters(
  filters: FilterOptions,
  tmdbToken: string,
): Promise<Movie[]> {
  const pages = await Promise.all(
    Array.from({ length: TMDB_MOVIE_PAGE_COUNT }, async (_, index) => {
      const params = new URLSearchParams({
        sort_by: filters.sort ?? "popularity.desc",
        include_adult: "false",
        include_video: "false",
        language: "en-US",
        page: String(index + 1),
        "vote_count.gte": "80",
        watch_region: WATCH_REGION,
        with_watch_monetization_types: "flatrate|rent|buy|ads|free",
      });

      if (filters.genres?.length) {
        params.set("with_genres", filters.genres.join(","));
      }

      if (filters.year) {
        params.set("primary_release_year", filters.year);
      }

      const data = await tmdbFetch<any>(`/discover/movie?${params}`, tmdbToken);
      return ((data?.results ?? []) as any[]).map(normalizeTmdbMovie);
    }),
  );

  return Array.from(
    new Map(
      pages.flat().map((movie) => [movie.tmdbId ?? movie.id, movie]),
    ).values(),
  );
}

async function fetchBackendMoviesWithFilters(
  filters: FilterOptions,
): Promise<Movie[]> {
  const params = new URLSearchParams();

  if (filters.genres?.length) {
    params.set("genres", filters.genres.join(","));
  }

  if (filters.year) {
    params.set("year", filters.year);
  }

  const query = params.toString();
  const data = await request<any>(`/movies${query ? `?${query}` : ""}`);
  return normalizeMovies(data?.movies ?? data ?? []);
}

export async function fetchMoviesWithFilters(
  filters: FilterOptions = {},
): Promise<Movie[]> {
  const tmdbToken = getTmdbToken();

  if (tmdbToken) {
    const tmdbMovies = await fetchTmdbMoviesWithFilters(filters, tmdbToken);
    const availableMovies = await filterByWatchAvailability(
      tmdbMovies,
      tmdbToken,
    );

    if (availableMovies.length > 0) {
      return sortMovies(availableMovies, filters.sort).slice(0, 100);
    }
  }

  const backendMovies = await fetchBackendMoviesWithFilters(filters);
  return sortMovies(backendMovies, filters.sort).slice(0, 100);
}

export async function fetch100TmdbMovies(): Promise<Movie[]> {
  return fetchMoviesWithFilters({});
}
