import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useInfoToolTip } from "@/components/InfoToolTip";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { api, MAX_FAVORITE_MOVIES, Movie } from "@/services/api";

export default function AccountSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading, deleteAccount } = useAuth();
  const { showInfoTooltip } = useInfoToolTip();
  const [isDeleting, setIsDeleting] = useState(false);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesEditing, setFavoritesEditing] = useState(false);
  const [removingFavoriteId, setRemovingFavoriteId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  const loadFavorites = useCallback(async () => {
    setFavoritesLoading(true);
    try {
      const movies = await api.getFavorites();
      setFavorites(movies);
      setFavoritesLoaded(true);
    } catch (error: any) {
      showInfoTooltip("error", error.message || "Could not load favorites.");
    } finally {
      setFavoritesLoading(false);
    }
  }, [showInfoTooltip]);

  const toggleFavoritesOpen = () => {
    if (favoritesOpen) {
      setFavoritesOpen(false);
      setFavoritesEditing(false);
      return;
    }

    setFavoritesOpen(true);
    if (!favoritesLoaded) {
      void loadFavorites();
    }
  };

  const removeAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showInfoTooltip("success", "Your account was deleted permanently.");
      router.dismissAll();
      router.replace("/");
    } catch (error: any) {
      showInfoTooltip(
        "error",
        error.message || "Could not delete your account.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account permanently?",
      "Your user profile and swipe history will be deleted. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: removeAccount,
        },
      ],
    );
  };

  const removeFavorite = async (movie: Movie) => {
    const movieId = movie.tmdbId ?? movie.id;
    if (!Number.isFinite(movieId)) return;

    try {
      setRemovingFavoriteId(movieId);
      const updatedFavorites = await api.removeFavorite(movieId);
      setFavorites(updatedFavorites);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showInfoTooltip("success", "Removed from favorites.");
    } catch (error: any) {
      showInfoTooltip(
        "error",
        error.message || "Could not remove this favorite.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRemovingFavoriteId(null);
    }
  };

  const confirmRemoveFavorite = (movie: Movie) => {
    Alert.alert(
      "Remove favorite?",
      `Remove "${movie.title}" from your watch later list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFavorite(movie),
        },
      ],
    );
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#17092A", "#0E051A"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Platform.OS === "web" ? 40 : 16),
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={26} color={colors.foreground} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Manage your FILMERA account.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>
              {user.email}
            </Text>
          </View>
        </View>

        <View style={styles.favoritesCard}>
          <Pressable
            onPress={toggleFavoritesOpen}
            style={({ pressed }) => [
              styles.favoritesSummary,
              { opacity: pressed ? 0.72 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open favorites"
          >
            <View style={styles.sectionTitleRow}>
              <View style={styles.policyIcon}>
                <Feather name="star" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.policyTitle}>Favorites</Text>
                <Text
                  style={[
                    styles.policyDescription,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Tap to view movies saved to watch later.
                </Text>
              </View>
            </View>
            <Feather
              name={favoritesOpen ? "chevron-up" : "chevron-down"}
              size={21}
              color={colors.mutedForeground}
            />
          </Pressable>

          {favoritesOpen ? (
            <>
              <View style={styles.favoritesToolbar}>
                <Text
                  style={[
                    styles.favoriteLimitText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {favorites.length}/{MAX_FAVORITE_MOVIES} saved
                </Text>
                {favorites.length > 0 ? (
                  <Pressable
                    onPress={() => setFavoritesEditing((editing) => !editing)}
                    style={({ pressed }) => [
                      styles.editButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.editButtonText}>
                      {favoritesEditing ? "Done" : "Edit"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {favoritesLoading ? (
                <ActivityIndicator color={colors.accent} style={styles.favoritesLoader} />
              ) : favorites.length === 0 ? (
                <Text
                  style={[
                    styles.emptyFavoritesText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Tap the star on a movie card to save it here.
                </Text>
              ) : (
                <View style={styles.favoritesList}>
                  {favorites.map((movie) => {
                    const movieId = movie.tmdbId ?? movie.id;
                    const isRemoving = removingFavoriteId === movieId;

                    return (
                      <View key={`${movieId}-${movie.title}`} style={styles.favoriteItem}>
                        {movie.poster ? (
                          <Image
                            source={{ uri: movie.poster }}
                            style={styles.favoritePoster}
                          />
                        ) : (
                          <View style={styles.favoritePosterFallback}>
                            <Feather
                              name="film"
                              size={18}
                              color={colors.mutedForeground}
                            />
                          </View>
                        )}
                        <View style={styles.favoriteCopy}>
                          <Text style={styles.favoriteTitle} numberOfLines={1}>
                            {movie.title}
                          </Text>
                          <Text
                            style={[
                              styles.favoriteMeta,
                              { color: colors.mutedForeground },
                            ]}
                            numberOfLines={1}
                          >
                            {[movie.year, movie.rating ? `TMDB ${movie.rating}` : ""]
                              .filter(Boolean)
                              .join(" • ")}
                          </Text>
                        </View>
                        {favoritesEditing ? (
                          <Pressable
                            onPress={() => confirmRemoveFavorite(movie)}
                            disabled={isRemoving}
                            style={({ pressed }) => [
                              styles.removeFavoriteButton,
                              { opacity: pressed || isRemoving ? 0.65 : 1 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${movie.title} from favorites`}
                          >
                            {isRemoving ? (
                              <ActivityIndicator size="small" color="#F43F5E" />
                            ) : (
                              <Feather name="trash-2" size={18} color="#F43F5E" />
                            )}
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}
        </View>

        <Pressable
          onPress={() => Linking.openURL("https://filmera.us/privacy")}
          style={({ pressed }) => [
            styles.policyButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.policyIcon}>
            <Feather name="shield" size={20} color={colors.accent} />
          </View>
          <View style={styles.policyCopy}>
            <Text style={styles.policyTitle}>Privacy Policy</Text>
            <Text style={[styles.policyDescription, { color: colors.mutedForeground }]}>
              Learn how FILMERA handles your information.
            </Text>
          </View>
          <Feather
            name="external-link"
            size={19}
            color={colors.mutedForeground}
          />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL("https://filmera.us/terms")}
          style={({ pressed }) => [
            styles.policyButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.policyIcon}>
            <Feather name="file-text" size={20} color={colors.accent} />
          </View>
          <View style={styles.policyCopy}>
            <Text style={styles.policyTitle}>Terms of Use</Text>
            <Text
              style={[
                styles.policyDescription,
                { color: colors.mutedForeground },
              ]}
            >
              Review the rules for using FILMERA.
            </Text>
          </View>
          <Feather
            name="external-link"
            size={19}
            color={colors.mutedForeground}
          />
        </Pressable>

        <View style={styles.creditsCard}>
          <View style={styles.policyIcon}>
            <Feather name="film" size={20} color={colors.accent} />
          </View>
          <View style={styles.policyCopy}>
            <Text style={styles.policyTitle}>Credits</Text>
            <Text
              style={[
                styles.policyDescription,
                { color: colors.mutedForeground },
              ]}
            >
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </Text>
            <Pressable
              onPress={() => Linking.openURL("https://www.themoviedb.org/")}
              style={styles.attributionLink}
              accessibilityRole="link"
              accessibilityLabel="Movie data by TMDB"
            >
              <Text style={[styles.attributionText, { color: colors.accent }]}>
                Movie data by TMDB
              </Text>
              <Feather name="external-link" size={14} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        <View style={styles.dangerCard}>
          <View style={styles.dangerIcon}>
            <Feather name="trash-2" size={20} color="#F43F5E" />
          </View>
          <View style={styles.dangerCopy}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text
              style={[
                styles.dangerDescription,
                { color: colors.mutedForeground },
              ]}
              numberOfLines={1}
            >
              Permanently delete your account.
            </Text>
          </View>
          <Pressable
            onPress={confirmDelete}
            disabled={isDeleting}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: isDeleting || pressed ? 0.65 : 1 },
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E051A",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 28,
  },
  backButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  backText: {
    color: "#FDFBEF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  header: { gap: 6 },
  title: {
    color: "#FDFBEF",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 30,
  },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD600",
  },
  avatarText: {
    color: "#17092A",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 22,
  },
  profileCopy: { flex: 1, gap: 3 },
  name: {
    color: "#FDFBEF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  email: { fontFamily: "Inter_400Regular", fontSize: 14 },
  favoritesCard: {
    gap: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  favoritesSummary: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  editButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,214,0,0.12)",
  },
  editButtonText: {
    color: "#FFD600",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  favoritesToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 2,
  },
  favoriteLimitText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  favoritesLoader: {
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  emptyFavoritesText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  favoritesList: {
    gap: 12,
  },
  favoriteItem: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  favoritePoster: {
    width: 42,
    height: 58,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  favoritePosterFallback: {
    width: 42,
    height: 58,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  favoriteCopy: {
    flex: 1,
    gap: 4,
  },
  favoriteTitle: {
    color: "#FDFBEF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  favoriteMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  removeFavoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,63,94,0.1)",
  },
  policyButton: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  policyIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(255,214,0,0.1)",
  },
  policyCopy: { flex: 1, gap: 3 },
  policyTitle: {
    color: "#FDFBEF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  policyDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  creditsCard: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  attributionLink: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  attributionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  dangerCard: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.45)",
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  dangerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "rgba(244,63,94,0.12)",
  },
  dangerCopy: { flex: 1, gap: 3 },
  dangerTitle: {
    color: "#F43F5E",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  dangerDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  deleteButton: {
    minWidth: 62,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D91E3D",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
});
