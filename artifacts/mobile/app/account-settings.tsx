import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function AccountSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading, deleteAccount } = useAuth();
  const { showInfoTooltip } = useInfoToolTip();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, router, user]);

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

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text
            style={[styles.dangerDescription, { color: colors.mutedForeground }]}
          >
            Permanently deletes your user profile and swipe history, and removes
            you from every room.
          </Text>
          <Pressable
            onPress={confirmDelete}
            disabled={isDeleting}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: isDeleting || pressed ? 0.65 : 1 },
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="trash-2" size={18} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </>
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
  policyButton: {
    minHeight: 76,
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
  dangerCard: {
    gap: 14,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.45)",
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  dangerTitle: {
    color: "#F43F5E",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 20,
  },
  dangerDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  deleteButton: {
    height: 52,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#D91E3D",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});
