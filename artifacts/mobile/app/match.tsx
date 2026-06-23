import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { api, fetchMovieWatchProviders, WatchProvider } from "@/services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 22;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

const PARTICLE_COLORS = [
  "#9333EA", "#BB55FF", "#FFD600", "#FFE566",
  "#22C55E", "#3B82F6", "#F43F5E", "#C026D3",
];

function useParticles(): Particle[] {
  return useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(SCREEN_WIDTH / 2),
      y: new Animated.Value(SCREEN_HEIGHT * 0.38),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }))
  ).current;
}

function getProviderLink(
  providerName: string,
  movieTitle: string,
  fallbackLink: string,
): string {
  const query = encodeURIComponent(movieTitle);
  const normalizedName = providerName.toLowerCase();

  if (normalizedName.includes("netflix")) {
    return `https://www.netflix.com/search?q=${query}`;
  }
  if (normalizedName.includes("prime")) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
  }
  if (normalizedName.includes("disney")) {
    return `https://www.disneyplus.com/search?q=${query}`;
  }
  if (normalizedName.includes("hulu")) {
    return `https://www.hulu.com/search?q=${query}`;
  }
  if (normalizedName.includes("max")) {
    return `https://www.max.com/search?q=${query}`;
  }
  if (normalizedName.includes("apple")) {
    return `https://tv.apple.com/search?term=${query}`;
  }
  if (normalizedName.includes("paramount")) {
    return `https://www.paramountplus.com/search/?query=${query}`;
  }
  if (normalizedName.includes("peacock")) {
    return `https://www.peacocktv.com/search?q=${query}`;
  }
  if (normalizedName.includes("crunchyroll")) {
    return `https://www.crunchyroll.com/search?q=${query}`;
  }
  if (normalizedName.includes("starz")) {
    return `https://www.starz.com/us/en/search?q=${query}`;
  }

  return fallbackLink;
}

export default function MatchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    movieTitle: string;
    moviePoster: string;
    movieYear: string;
    movieGenre: string;
    movieRating: string;
    movieId: string;
    partnerName: string;
    myName: string;
    roomCode: string;
  }>();
  const [clearingMatch, setClearingMatch] = useState(false);
  const [actionError, setActionError] = useState("");
  const [providerError, setProviderError] = useState("");
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const particles = useParticles();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const loadProviders = async () => {
    if (providersLoading) return;

    if (showProviders) {
      setShowProviders(false);
      return;
    }

    setShowProviders(true);
    if (providers.length > 0) return;

    try {
      setProvidersLoading(true);
      setProviderError("");
      const movieId = Number(params.movieId);
      if (!Number.isFinite(movieId)) {
        throw new Error("Could not identify this movie.");
      }
      const availableProviders = await fetchMovieWatchProviders(movieId);
      setProviders(availableProviders);
      if (availableProviders.length === 0) {
        setProviderError("No streaming providers found for this movie.");
      }
    } catch (error: any) {
      setProviderError(error.message || "Could not load watch providers.");
    } finally {
      setProvidersLoading(false);
    }
  };

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(titleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
      }),
    ]).start();

    particles.forEach((p, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
      const radius = 100 + Math.random() * 160;
      const targetX = SCREEN_WIDTH / 2 + Math.cos(angle) * radius;
      const targetY = SCREEN_HEIGHT * 0.38 + Math.sin(angle) * radius;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.x, { toValue: targetX, duration: 900 + Math.random() * 400, useNativeDriver: false }),
          Animated.timing(p.y, { toValue: targetY, duration: 900 + Math.random() * 400, useNativeDriver: false }),
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(p.opacity, { toValue: 0, duration: 700, useNativeDriver: false }),
          ]),
          Animated.spring(p.scale, { toValue: 1 + Math.random() * 0.8, useNativeDriver: false, friction: 8 }),
        ]).start();
      }, i * 55);
    });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2E1745", "#17092A", "#0E051A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Purple glow */}
      <View style={styles.glowCenter} />

      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              opacity: p.opacity,
              transform: [{ scale: p.scale }],
              backgroundColor: p.color,
            },
          ]}
        />
      ))}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Match badge */}
        <Animated.View style={[styles.matchBadge, { transform: [{ scale: titleAnim }] }]}>
          <Text style={styles.matchEmoji}>🎉</Text>
          <Text style={styles.matchLabel}>IT'S A MATCH</Text>
          <Text style={[styles.matchSub, { color: colors.mutedForeground }]}>
            {params.myName} & {params.partnerName} both liked it
          </Text>
        </Animated.View>

        {/* Poster */}
        <Animated.View style={[styles.posterWrap, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={{ uri: params.moviePoster }}
            style={styles.poster}
            resizeMode="cover"
          />
          {/* Gold glow border */}
          <LinearGradient
            colors={["#FFD600", "#BB55FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.posterBorderGlow}
          />
          <View style={[styles.heartBadge]}>
            <LinearGradient
              colors={["#FFD600", "#FFE566"]}
              style={styles.heartGradient}
            >
              <Feather name="heart" size={20} color="#17092A" />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Movie info */}
        <Animated.View style={[styles.movieInfo, { opacity: fadeAnim }]}>
          <Text style={[styles.movieTitle, { color: colors.foreground }]}>
            {params.movieTitle}
          </Text>
          <Text style={[styles.movieMeta, { color: colors.mutedForeground }]}>
            {params.movieYear} · {params.movieGenre}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingSource, { color: colors.accent }]}>
              TMDB
            </Text>
            <Text style={[styles.ratingVal, { color: colors.accent }]}>
              {params.movieRating}
            </Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          <Pressable
            style={({ pressed }) => [
              styles.keepBtn,
              {
                backgroundColor: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,214,0,0.35)",
                opacity: pressed || providersLoading ? 0.75 : 1,
              },
            ]}
            onPress={loadProviders}
            disabled={providersLoading}
          >
            {providersLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Feather name="play-circle" size={17} color={colors.accent} />
                <Text style={[styles.keepBtnText, { color: colors.accent }]}>
                  Where to Watch
                </Text>
              </>
            )}
          </Pressable>

          {showProviders ? (
            <View style={styles.providersCard}>
              {providers.map((provider) => (
                <Pressable
                  key={provider.id}
                  style={({ pressed }) => [
                    styles.providerRow,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() =>
                    Linking.openURL(
                      getProviderLink(
                        provider.name,
                        params.movieTitle,
                        provider.link,
                      ),
                    )
                  }
                >
                  {provider.logo ? (
                    <Image
                      source={{ uri: provider.logo }}
                      style={styles.providerLogo}
                    />
                  ) : (
                    <View style={styles.providerLogoFallback}>
                      <Feather
                        name="tv"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.providerName,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {provider.name}
                  </Text>
                  <Feather
                    name="external-link"
                    size={15}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))}

              {providerError ? (
                <Text
                  style={[
                    styles.providerError,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {providerError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            disabled={clearingMatch}
            style={({ pressed }) => [
              { opacity: pressed || clearingMatch ? 0.75 : 1 },
            ]}
            onPress={async () => {
              if (clearingMatch) return;

              try {
                setClearingMatch(true);
                setActionError("");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await api.clearMatch(params.roomCode);
                router.back();
              } catch (error: any) {
                setActionError(error.message || "Could not continue swiping.");
              } finally {
                setClearingMatch(false);
              }
            }}
          >
            <LinearGradient
              colors={["#FFD600", "#FFE566"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.watchBtn}
            >
              {clearingMatch ? (
                <ActivityIndicator color="#17092A" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={18} color="#17092A" />
                  <Text style={styles.watchBtnText}>Keep Swiping</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {actionError ? (
            <Text style={[styles.actionError, { color: colors.dislike }]}>
              {actionError}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.keepBtn,
              {
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.12)",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              router.dismissAll();
              router.replace("/");
            }}
          >
            <Feather name="log-out" size={16} color="#FDFBEF" />
            <Text style={[styles.keepBtnText, { color: colors.foreground }]}>
              Leave Room
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A", overflow: "hidden" },
  glowCenter: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.2,
    left: SCREEN_WIDTH / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(147,51,234,0.3)",
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    marginTop: -5,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 22,
  },
  matchBadge: { alignItems: "center", gap: 4 },
  matchEmoji: { fontSize: 40, marginBottom: 4 },
  matchLabel: {
    fontSize: 32,
    fontFamily: "Poppins_800ExtraBold",
    color: "#FFD600",
    letterSpacing: 3,
  },
  matchSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  actionError: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  posterWrap: {
    position: "relative",
  },
  posterBorderGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: 22,
    zIndex: -1,
  },
  poster: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55 * 1.5,
    borderRadius: 20,
  },
  heartBadge: {
    position: "absolute",
    bottom: -14,
    right: -14,
  },
  heartGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFD600",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  movieInfo: { alignItems: "center", gap: 4 },
  movieTitle: {
    fontSize: 22,
    fontFamily: "Poppins_800ExtraBold",
    textAlign: "center",
  },
  movieMeta: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingSource: { fontSize: 12, fontFamily: "Inter_700Bold" },
  ratingVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actions: { width: "100%", gap: 12 },
  providersCard: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  providerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  providerLogo: {
    width: 32,
    height: 32,
    borderRadius: 7,
  },
  providerLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  providerName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  providerError: {
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  watchBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  watchBtnText: {
    fontSize: 16,
    fontFamily: "Poppins_800ExtraBold",
    color: "#17092A",
  },
  keepBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  keepBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
