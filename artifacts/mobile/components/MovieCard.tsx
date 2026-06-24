import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { CARD_GRADIENTS } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { fetchMovieCredits, Movie, MovieCredits } from "@/services/api";

export type { Movie };

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 100;
const SWIPE_OUT_DURATION = 170;

export interface MovieCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface MovieCardProps {
  movie: Movie;
  onSwipeLeft: () => boolean | Promise<boolean>;
  onSwipeRight: () => boolean | Promise<boolean>;
  isTop: boolean;
  stackIndex?: number;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onToggleFavorite?: (movie: Movie) => void | Promise<void>;
}

export const MovieCard = forwardRef<MovieCardRef, MovieCardProps>(
  (
    {
      movie,
      onSwipeLeft,
      onSwipeRight,
      isTop,
      stackIndex = 0,
      isFavorite = false,
      favoriteLoading = false,
      onToggleFavorite,
    },
    ref,
  ) => {
    const colors = useColors();
    const position = useRef(new Animated.ValueXY()).current;
    const isAnimating = useRef(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [credits, setCredits] = useState<MovieCredits | null>(null);
    const [creditsError, setCreditsError] = useState("");
    const [creditsLoading, setCreditsLoading] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const gradientPair = CARD_GRADIENTS[movie.id % CARD_GRADIENTS.length];
    const description = movie.genre ?? movie.overview ?? "";

    const loadCredits = useCallback(async () => {
      if (!isTop) return;

      if (showCredits) {
        setShowCredits(false);
        return;
      }

      setShowCredits(true);
      if (credits || creditsLoading) return;

      try {
        setCreditsLoading(true);
        setCreditsError("");
        const movieId = movie.tmdbId ?? movie.id;
        const movieCredits = await fetchMovieCredits(movieId);
        setCredits(movieCredits);
        if (
          !movieCredits.director &&
          movieCredits.cast.length === 0 &&
          !movieCredits.certification
        ) {
          setCreditsError("Credits are not available for this movie.");
        }
      } catch (error: any) {
        setCreditsError(error.message || "Could not load credits.");
      } finally {
        setCreditsLoading(false);
      }
    }, [credits, creditsLoading, isTop, movie.id, movie.tmdbId, showCredits]);

    const resetPosition = useCallback(() => {
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 8,
      }).start();
    }, [position]);

    const forceSwipe = useCallback(
      (direction: "right" | "left") => {
        if (isAnimating.current) return;
        isAnimating.current = true;

        const x =
          direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        Animated.timing(position, {
          toValue: { x, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: false,
        }).start(async () => {
          const didSave =
            direction === "right"
              ? await onSwipeRight()
              : await onSwipeLeft();

          if (!didSave) resetPosition();
          isAnimating.current = false;
        });
      },
      [position, onSwipeLeft, onSwipeRight, resetPosition]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => forceSwipe("left"),
      swipeRight: () => forceSwipe("right"),
    }));

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          isTop && (Math.abs(dx) > 8 || Math.abs(dy) > 8),
        onPanResponderMove: (_, { dx, dy }) => {
          position.setValue({ x: dx, y: dy });
        },
        onPanResponderRelease: (_, { dx }) => {
          if (dx > SWIPE_THRESHOLD) forceSwipe("right");
          else if (dx < -SWIPE_THRESHOLD) forceSwipe("left");
          else resetPosition();
        },
      })
    ).current;

    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ["-8deg", "0deg", "8deg"],
      extrapolate: "clamp",
    });

    const likeOpacity = position.x.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    const passOpacity = position.x.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    const cardAnimatedStyle = isTop
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          transform: [{ scale: 1 }, { translateY: 0 }],
        };

    return (
      <Animated.View
        {...(isTop ? panResponder.panHandlers : {})}
        style={[styles.card, cardAnimatedStyle]}
      >
        {/* Gradient fallback background */}
        <LinearGradient
          colors={[gradientPair[0], gradientPair[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Poster image */}
        <Image
          source={{ uri: movie.poster }}
          style={styles.poster}
          resizeMode="cover"
          fadeDuration={0}
        />

        {/* Bottom gradient fade */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
          style={styles.fade}
          pointerEvents="none"
        />

        {/* Like / Pass stamps */}
        {isTop && (
          <>
            <Pressable
              onPress={loadCredits}
              style={({ pressed }) => [
                styles.infoButton,
                { opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Show movie cast and director"
            >
              <Feather name="info" size={20} color="#FDFBEF" />
            </Pressable>

            <Pressable
              onPress={() => onToggleFavorite?.(movie)}
              disabled={favoriteLoading}
              style={({ pressed }) => [
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
                { opacity: pressed || favoriteLoading ? 0.72 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isFavorite ? "Remove movie from favorites" : "Save movie to favorites"
              }
            >
              <Feather
                name="star"
                size={21}
                color={isFavorite ? "#17092A" : "#FDFBEF"}
              />
            </Pressable>

            <Animated.View
              style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}
            >
              <Text style={[styles.stampText, { color: colors.like }]}>
                LIKE
              </Text>
            </Animated.View>
            <Animated.View
              style={[styles.stamp, styles.passStamp, { opacity: passOpacity }]}
            >
              <Text style={[styles.stampText, { color: colors.dislike }]}>
                NOPE
              </Text>
            </Animated.View>
          </>
        )}

        {isTop && showCredits ? (
          <View style={styles.creditsPanel}>
            <View style={styles.creditsHeader}>
              <Text style={styles.creditsTitle}>Movie Info</Text>
              <Pressable
                onPress={() => setShowCredits(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close movie info"
              >
                <Feather name="x" size={18} color="#FDFBEF" />
              </Pressable>
            </View>

            {creditsLoading ? (
              <Text style={styles.creditsText}>Loading cast...</Text>
            ) : creditsError ? (
              <Text style={styles.creditsText}>{creditsError}</Text>
            ) : (
              <>
                <Text style={styles.creditsLabel}>Director</Text>
                <Text style={styles.creditsText}>
                  {credits?.director || "Not available"}
                </Text>

                <Text style={styles.creditsLabel}>Rating</Text>
                <Text style={styles.creditsText}>
                  {credits?.certification || "Not rated"}
                </Text>

                <Text style={styles.creditsLabel}>Cast</Text>
                <Text style={styles.creditsText}>
                  {credits?.cast.length
                    ? credits.cast.join(", ")
                    : "Not available"}
                </Text>
              </>
            )}
          </View>
        ) : null}

        {/* Movie info */}
        <View style={styles.info}>
          <View style={styles.metaRow}>
            <Text style={styles.ratingSource}>TMDB</Text>
            <Text style={styles.rating}>{movie.rating}</Text>
            <Text style={styles.year}>{movie.year}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
          {!!description && (
            <Pressable
              onPress={() => setIsDescriptionExpanded((expanded) => !expanded)}
              hitSlop={8}
              style={({ pressed }) => [pressed && styles.descriptionPressed]}
            >
              <Text
                style={[
                  styles.description,
                  isDescriptionExpanded && styles.descriptionExpanded,
                ]}
                numberOfLines={isDescriptionExpanded ? undefined : 2}
              >
                {description}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    );
  }
);

MovieCard.displayName = "MovieCard";

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 12,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  infoButton: {
    position: "absolute",
    top: 18,
    left: 18,
    zIndex: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  favoriteButton: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  favoriteButtonActive: {
    borderColor: "rgba(255,214,0,0.75)",
    backgroundColor: "#FFD600",
  },
  creditsPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 72,
    zIndex: 5,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(14,5,26,0.92)",
  },
  creditsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  creditsTitle: {
    color: "#FDFBEF",
    fontSize: 16,
    fontFamily: "Poppins_800ExtraBold",
  },
  creditsLabel: {
    marginTop: 8,
    color: "#FFD600",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  creditsText: {
    marginTop: 3,
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  ratingSource: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFD600",
  },
  rating: {
    fontSize: 13,
    color: "#FFD600",
    fontFamily: "Inter_600SemiBold",
  },
  year: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_800ExtraBold",
    color: "#FFFFFF",
    lineHeight: 34,
  },
  description: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  descriptionExpanded: {
    color: "rgba(255,255,255,0.86)",
  },
  descriptionPressed: {
    opacity: 0.75,
  },
  stamp: {
    position: "absolute",
    top: 48,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 4,
    borderRadius: 8,
  },
  likeStamp: {
    left: 20,
    borderColor: "#22C55E",
    transform: [{ rotate: "-12deg" }],
  },
  passStamp: {
    right: 20,
    borderColor: "#F43F5E",
    transform: [{ rotate: "12deg" }],
  },
  stampText: {
    fontSize: 26,
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: 2,
  },
});
