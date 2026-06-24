import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Movie, MovieCard, MovieCardRef } from "@/components/MovieCard";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  fetchMoviesWithFilters,
  FilterOptions,
  MAX_FAVORITE_MOVIES,
  Room,
} from "@/services/api";
import { connectRoomRealtime } from "@/services/roomRealtime";

// ─── Genre list (TMDB IDs) ─────────────────────────────────────────────────
const GENRES = [
  { id: 28,    label: "Action" },
  { id: 12,    label: "Adventure" },
  { id: 16,    label: "Animation" },
  { id: 35,    label: "Comedy" },
  { id: 80,    label: "Crime" },
  { id: 18,    label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14,    label: "Fantasy" },
  { id: 27,    label: "Horror" },
  { id: 9648,  label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878,   label: "Sci-Fi" },
  { id: 53,    label: "Thriller" },
  { id: 37,    label: "Western" },
];

// TMDB watch provider IDs for the US region.
const STREAMING_PROVIDERS = [
  { id: 8, label: "Netflix" },
  { id: 9, label: "Prime Video" },
  { id: 337, label: "Disney+" },
  { id: 15, label: "Hulu" },
  { id: 1899, label: "Max" },
  { id: 350, label: "Apple TV+" },
  { id: 531, label: "Paramount+" },
  { id: 386, label: "Peacock" },
  { id: 283, label: "Crunchyroll" },
  { id: 257, label: "fuboTV" },
  { id: 43, label: "Starz" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [
  { value: "", label: "Any" },
  ...Array.from({ length: CURRENT_YEAR - 1969 }, (_, index) => {
    const year = String(CURRENT_YEAR - index);
    return { value: year, label: year };
  }),
];

const SORTS = [
  { value: "popularity.desc",   label: "Popular" },
  { value: "vote_average.desc", label: "Top Rated" },
  { value: "release_date.desc", label: "Newest" },
];

type Stage = "loading" | "config" | "waiting" | "swiping" | "finished" | "matched";

export default function RoomScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { action, code: codeParam } = useLocalSearchParams<{ action: string; code: string }>();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const [stage, setStage] = useState<Stage>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedMovie, setMatchedMovie] = useState<Movie | null>(null);
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [loadingLabel, setLoadingLabel] = useState("Setting up room…");

  // Filter state
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSort, setSelectedSort] = useState("popularity.desc");
  const [startingGame, setStartingGame] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<Set<number>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);

  const cardRef = useRef<MovieCardRef>(null);
  const swiping = useRef(false);
  const navigatingToMatch = useRef(false);
  const didInit = useRef(false);
  const stageRef = useRef<Stage>("loading");
  const moviesRef = useRef<Movie[]>([]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  const showMatch = useCallback(
    (movie: Movie) => {
      if (navigatingToMatch.current) return;

      navigatingToMatch.current = true;
      setMatchedMovie(movie);
      setStage("matched");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.push({
          pathname: "/match",
          params: {
            movieTitle: movie.title,
            moviePoster: movie.poster,
            movieYear: movie.year,
            movieGenre: movie.genre ?? "",
            movieRating: movie.rating,
            movieId: String(movie.tmdbId ?? movie.id),
            partnerName: "your partner",
            myName: user?.name ?? "You",
            roomCode: room?.code ?? codeParam ?? "",
          },
        });
      }, 400);
    },
    [codeParam, room?.code, router, user]
  );

  // ── Initialize on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    initRoom();
  }, []);

  useEffect(() => {
    let isMounted = true;

    api
      .getFavorites()
      .then((favorites) => {
        if (!isMounted) return;
        setFavoriteMovieIds(
          new Set(
            favorites
              .map((movie) => movie.tmdbId ?? movie.id)
              .filter((id): id is number => Number.isFinite(id)),
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Realtime participants & match updates ────────────────────────────────
  useEffect(() => {
    if (!room) return;

    const connection = connectRoomRealtime({
      roomCode: room.code,
      onRoom: (updated) => {
        setRoom(updated);
        setParticipantCount(updated.participants.length || 1);

        if (stageRef.current === "waiting" && updated.movies.length > 0) {
          setMovies(updated.movies);
          setCurrentIndex(0);
          setStage("swiping");
        }

        if (updated.matchedMovie) {
          showMatch(updated.matchedMovie);
        } else if (
          stageRef.current === "matched" &&
          navigatingToMatch.current
        ) {
          navigatingToMatch.current = false;
          setMatchedMovie(null);
          setCurrentIndex((index) => {
            const next = index + 1;
            setStage(next >= moviesRef.current.length ? "finished" : "swiping");
            return next;
          });
        }
      },
      onMatch: showMatch,
      onError: (message) => {
        if (stageRef.current !== "matched") setError(message);
      },
    });

    return () => connection.close();
  }, [room?.code, showMatch]);

  const initRoom = async () => {
    setError("");
    if (action === "create") {
      setStage("loading");
      setLoadingLabel("Creating room…");
      try {
        const createdRoom = await api.createRoom();
        setRoom(createdRoom);
        setParticipantCount(createdRoom.participants.length || 1);
        setStage("config");
      } catch (e: any) {
        setError(e.message || "Failed to create room");
      }
    } else {
      // Join existing room
      setStage("loading");
      setLoadingLabel("Joining room…");
      try {
        const joined = await api.joinRoom(codeParam ?? "");
        setRoom(joined);
        setParticipantCount(joined.participants.length || 1);
        if (joined.movies.length > 0) {
          setMovies(joined.movies);
          setCurrentIndex(0);
          setStage("swiping");
        } else {
          setStage("waiting");
        }
      } catch (e: any) {
        setError(e.message || "Failed to join room");
      }
    }
  };

  // ── Host presses "Start Swiping" ────────────────────────────────────────
  const handleStartGame = async () => {
    if (startingGame) return;
    setStartingGame(true);
    setError("");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const filters: FilterOptions = {
        genres: selectedGenres.length ? selectedGenres : undefined,
        providers: selectedProviders.length ? selectedProviders : undefined,
        year: selectedYear || undefined,
        sort: selectedSort,
      };
      const fetched = await fetchMoviesWithFilters(filters);
      if (fetched.length === 0) {
        throw new Error("No movies found for these filters. Try a different year or genre.");
      }

      const readyRoom = room
        ? await api.setRoomMovies(room.code, fetched)
        : await api.createRoom(fetched);
      setRoom(readyRoom);
      setMovies(readyRoom.movies.length > 0 ? readyRoom.movies : fetched);
      setParticipantCount(readyRoom.participants.length || 1);
      setCurrentIndex(0);
      setStage("swiping");
    } catch (e: any) {
      setError(e.message || "Failed to fetch movies");
    } finally {
      setStartingGame(false);
    }
  };

  // ── Swipe handler ────────────────────────────────────────────────────────
  const handleSwipe = useCallback(
    async (direction: "like" | "pass") => {
      if (swiping.current || stage !== "swiping" || !room) return false;
      const movie = movies[currentIndex];
      if (!movie) return false;

      swiping.current = true;
      setError("");
      Haptics.impactAsync(
        direction === "like" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      );

      const next = currentIndex + 1;
      if (next >= movies.length) setStage("finished");
      else setCurrentIndex(next);
      swiping.current = false;

      api
        .createSwipe({
          roomCode: room.code,
          movie,
          liked: direction === "like",
        })
        .then((result) => {
          if (result.match) showMatch(result.match);
        })
        .catch((e: any) => {
          setError(e.message || "Failed to save swipe. Try again.");
        });

      return true;
    },
    [currentIndex, movies, stage, room, showMatch]
  );

  const handleSwipeRight = useCallback(() => handleSwipe("like"), [handleSwipe]);
  const handleSwipeLeft = useCallback(() => handleSwipe("pass"), [handleSwipe]);
  const onPressLike = () => { if (stage === "swiping") cardRef.current?.swipeRight(); };
  const onPressPass = () => { if (stage === "swiping") cardRef.current?.swipeLeft(); };

  const currentMovie = movies[currentIndex];
  const nextMovie = movies[currentIndex + 1];
  const currentMovieFavoriteId = currentMovie?.tmdbId ?? currentMovie?.id;
  const roomCode = room?.code ?? codeParam ?? "";
  const inviteLink = roomCode
    ? Linking.createURL("room", {
        queryParams: { action: "join", code: roomCode },
      })
    : "";

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    await Clipboard.setStringAsync(inviteLink);
    setCopiedInvite(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  useEffect(() => {
    movies
      .slice(currentIndex, currentIndex + 4)
      .map((movie) => movie.poster)
      .filter(Boolean)
      .forEach((poster) => {
        Image.prefetch(poster).catch(() => {});
      });
  }, [currentIndex, movies]);

  // ─── Toggle genre chip ──────────────────────────────────────────────────
  const toggleGenre = (id: number) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleProvider = (id: number) => {
    setSelectedProviders((prev) =>
      prev.includes(id)
        ? prev.filter((providerId) => providerId !== id)
        : [...prev, id],
    );
  };

  const toggleFavorite = useCallback(async (movie: Movie) => {
    const movieId = movie.tmdbId ?? movie.id;
    if (!Number.isFinite(movieId) || favoriteBusyId === movieId) return;

    const wasFavorite = favoriteMovieIds.has(movieId);

    if (!wasFavorite && favoriteMovieIds.size >= MAX_FAVORITE_MOVIES) {
      setError(`You can save up to ${MAX_FAVORITE_MOVIES} favorite movies.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setFavoriteBusyId(movieId);
    setFavoriteMovieIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (wasFavorite) nextIds.delete(movieId);
      else nextIds.add(movieId);
      return nextIds;
    });

    try {
      const favorites = wasFavorite
        ? await api.removeFavorite(movieId)
        : await api.addFavorite(movie);
      setFavoriteMovieIds(
        new Set(
          favorites
            .map((favorite) => favorite.tmdbId ?? favorite.id)
            .filter((id): id is number => Number.isFinite(id)),
        ),
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      setFavoriteMovieIds((currentIds) => {
        const nextIds = new Set(currentIds);
        if (wasFavorite) nextIds.add(movieId);
        else nextIds.delete(movieId);
        return nextIds;
      });
      setError(error.message || "Could not update favorites.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setFavoriteBusyId(null);
    }
  }, [favoriteBusyId, favoriteMovieIds]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#17092A", "#0E051A"]} style={StyleSheet.absoluteFill} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          {roomCode ? (
            <>
              <Text style={styles.headerTitle}>
                Room{" "}
                <Text style={{ color: colors.accent }}>{roomCode}</Text>
              </Text>
              <View style={styles.headerMeta}>
                <Feather name="users" size={12} color={colors.mutedForeground} />
                <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                  {participantCount} in room
                  {stage === "swiping" ? ` · ${currentIndex}/${movies.length} reviewed` : ""}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.headerTitle}>FILMERA</Text>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Screens ────────────────────────────────────────────────────── */}

      {/* LOADING */}
      {stage === "loading" && (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>{loadingLabel}</Text>
          {error ? (
            <>
              <Text style={[styles.stateSub, { color: "#FF6B6B" }]}>{error}</Text>
              <Pressable
                onPress={initRoom}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.ctaBtn}>
                  <Text style={styles.ctaText}>Retry</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

      {/* CONFIG (host only) */}
      {stage === "config" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.configScroll, { paddingBottom: bottomPad + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Share code banner */}
          <View style={styles.codeBanner}>
            <View style={styles.codeBannerIcon}>
              <Feather name="share-2" size={18} color={colors.accent} />
            </View>
            <View style={styles.codeBannerCopy}>
              <Text
                style={[
                  styles.codeBannerLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Invite your friends while you choose filters
              </Text>
              <Text style={styles.codeBannerCode}>
                {roomCode || "Creating code…"}
              </Text>
            </View>
            <Pressable
              onPress={copyInviteLink}
              disabled={!roomCode}
              style={({ pressed }) => [
                styles.copyLinkButton,
                {
                  opacity: !roomCode ? 0.45 : pressed ? 0.75 : 1,
                  borderColor: copiedInvite
                    ? "rgba(74,222,128,0.55)"
                    : "rgba(255,214,0,0.35)",
                },
              ]}
            >
              <Feather
                name={copiedInvite ? "check" : "copy"}
                size={15}
                color={copiedInvite ? "#4ADE80" : colors.accent}
              />
              <Text
                style={[
                  styles.copyLinkText,
                  { color: copiedInvite ? "#4ADE80" : colors.accent },
                ]}
              >
                {copiedInvite ? "Copied" : "Copy link"}
              </Text>
            </Pressable>
          </View>

          {/* Section: Genres */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            GENRES
          </Text>
          <Text style={[styles.sectionHint, { color: "rgba(255,255,255,0.3)" }]}>
            Leave blank for all genres
          </Text>
          <View style={styles.chipRow}>
            {GENRES.map((g) => {
              const active = selectedGenres.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleGenre(g.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Section: Streaming */}
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.mutedForeground, marginTop: 24 },
            ]}
          >
            STREAMING
          </Text>
          <Text
            style={[
              styles.sectionHint,
              { color: "rgba(255,255,255,0.3)" },
            ]}
          >
            Leave blank for any streaming provider
          </Text>
          <View style={styles.chipRow}>
            {STREAMING_PROVIDERS.map((provider) => {
              const active = selectedProviders.includes(provider.id);
              return (
                <Pressable
                  key={provider.id}
                  onPress={() => toggleProvider(provider.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {provider.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Section: Year */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>
            YEAR
          </Text>
          <Text style={[styles.sectionHint, { color: "rgba(255,255,255,0.3)" }]}>
            Pick an exact release year
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearScroller}
          >
            {YEARS.map((y) => {
              const active = selectedYear === y.value;
              return (
                <Pressable
                  key={y.value || "any"}
                  onPress={() => setSelectedYear(y.value)}
                  style={({ pressed }) => [
                    styles.pill,
                    active && styles.pillActive,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {y.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Section: Sort */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>
            SORT BY
          </Text>
          <View style={styles.pillRow}>
            {SORTS.map((s) => {
              const active = selectedSort === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSelectedSort(s.value)}
                  style={({ pressed }) => [
                    styles.pill,
                    active && styles.pillActive,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Error */}
          {error ? (
            <Text style={[styles.stateSub, { color: "#FF6B6B", marginTop: 12 }]}>{error}</Text>
          ) : null}

          {/* CTA */}
          <Pressable
            onPress={handleStartGame}
            disabled={startingGame}
            style={({ pressed }) => [{ opacity: pressed || startingGame ? 0.75 : 1, marginTop: 32 }]}
          >
            <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.ctaBtn}>
              {startingGame ? (
                <ActivityIndicator color="#17092A" />
              ) : (
                <>
                  <Feather name="play" size={18} color="#17092A" />
                  <Text style={styles.ctaText}>Start Swiping</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={[styles.stateSub, { color: "rgba(255,255,255,0.25)", marginTop: 12 }]}>
            Fetches 100 movies matching your filters
          </Text>
        </ScrollView>
      )}

      {/* WAITING (joiners) */}
      {stage === "waiting" && (
        <View style={styles.centerState}>
          <View style={styles.waitingIcon}>
            <Feather name="clock" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>
            Waiting for host
          </Text>
          <Text style={[styles.stateSub, { color: colors.mutedForeground }]}>
            The host is configuring filters.{"\n"}You'll start automatically when they're ready.
          </Text>
          <View style={styles.participantBadge}>
            <Feather name="users" size={14} color={colors.accent} />
            <Text style={[styles.participantText, { color: colors.foreground }]}>
              {participantCount} {participantCount === 1 ? "person" : "people"} in room
            </Text>
          </View>
          <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        </View>
      )}

      {/* SWIPING */}
      {stage === "swiping" && (
        <View style={styles.cardsArea}>
          {error ? (
            <Text style={[styles.swipeError, { color: colors.dislike }]}>
              {error}
            </Text>
          ) : null}
          <View style={styles.cards}>
            {nextMovie && (
              <MovieCard
                key={`bg-${nextMovie.id}`}
                movie={nextMovie}
                onSwipeLeft={() => false}
                onSwipeRight={() => false}
                isTop={false}
                stackIndex={1}
              />
            )}
            {currentMovie && (
              <MovieCard
                key={`top-${currentMovie.id}`}
                ref={cardRef}
                movie={currentMovie}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isTop={true}
                stackIndex={0}
                isFavorite={
                  Number.isFinite(currentMovieFavoriteId) &&
                  favoriteMovieIds.has(currentMovieFavoriteId)
                }
                favoriteLoading={favoriteBusyId === currentMovieFavoriteId}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </View>
        </View>
      )}

      {/* FINISHED */}
      {stage === "finished" && (
        <View style={styles.centerState}>
          <Feather name="film" size={48} color={colors.mutedForeground} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>All done!</Text>
          <Text style={[styles.stateSub, { color: colors.mutedForeground }]}>
            You've gone through all {movies.length} movies
          </Text>
          <Pressable
            onPress={() => {
              setCurrentIndex(0);
              setStage("swiping");
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.ctaBtn}>
              <Text style={styles.ctaText}>Start Over</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* MATCHED */}
      {stage === "matched" && matchedMovie && (
        <View style={styles.centerState}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={[styles.stateTitle, { color: colors.accent }]}>It's a Match!</Text>
          <Text
            style={[
              styles.stateSub,
              { color: colors.foreground, fontSize: 18, fontFamily: "Poppins_800ExtraBold" },
            ]}
          >
            {matchedMovie.title}
          </Text>
        </View>
      )}

      {/* ── Swipe action buttons ───────────────────────────────────────── */}
      {stage === "swiping" && (
        <View style={[styles.actions, { paddingBottom: bottomPad + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.skipFab,
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.15)",
                opacity: pressed ? 0.5 : 1,
              },
            ]}
            onPress={onPressPass}
          >
            <Feather name="x" size={28} color={colors.dislike} />
          </Pressable>

          <View style={styles.actionCenter}>
            <Text style={[styles.swipeHint, { color: colors.mutedForeground }]}>swipe or tap</Text>
          </View>

          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]} onPress={onPressLike}>
            <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.likeFab}>
              <Feather name="heart" size={26} color="#17092A" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FDFBEF" },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Center states
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  stateTitle: { fontSize: 24, fontFamily: "Poppins_800ExtraBold", textAlign: "center" },
  stateSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Waiting
  waitingIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,214,0,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  participantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  participantText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Config scroll
  configScroll: { paddingHorizontal: 20, paddingTop: 20 },
  codeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,214,0,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,214,0,0.2)",
    padding: 14,
    marginBottom: 28,
  },
  codeBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,214,0,0.12)",
  },
  codeBannerCopy: { flex: 1, gap: 3 },
  codeBannerLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  codeBannerCode: {
    color: "#FFD600",
    fontSize: 24,
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: 3,
  },
  copyLinkButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  copyLinkText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },

  // Genre chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipActive: {
    backgroundColor: "rgba(255,214,0,0.15)",
    borderColor: "#FFD600",
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },
  chipTextActive: { color: "#FFD600" },

  // Year / Sort pills
  yearScroller: { gap: 8, paddingRight: 20, marginTop: 10 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillActive: {
    backgroundColor: "rgba(255,214,0,0.15)",
    borderColor: "#FFD600",
  },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },
  pillTextActive: { color: "#FFD600", fontFamily: "Inter_600SemiBold" },

  // CTA
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 200,
  },
  ctaText: { fontSize: 17, fontFamily: "Poppins_800ExtraBold", color: "#17092A" },

  // Swiping
  cardsArea: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  swipeError: {
    marginBottom: 10,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  cards: { flex: 1, position: "relative" },

  // Buttons
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
    paddingTop: 8,
  },
  actionCenter: { flex: 1, alignItems: "center" },
  swipeHint: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  skipFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  likeFab: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
