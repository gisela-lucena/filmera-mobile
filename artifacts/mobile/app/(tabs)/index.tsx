import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useInfoToolTip } from "@/components/InfoToolTip";
import { api } from "@/services/api";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ passwordReset?: string }>();
  const insets = useSafeAreaInsets();
  const { user, login, signup, logout } = useAuth();
  const { showInfoTooltip } = useInfoToolTip();

  const [authModal, setAuthModal] = useState<"none" | "login" | "register">(
    "none",
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false);

  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [joinCode, setJoinCode] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

  useEffect(() => {
    if (params.passwordReset !== "openLogin") return;

    setAuthError("");
    setLoginPassword("");
    setAuthModal("login");
    router.setParams({ passwordReset: undefined });
  }, [params.passwordReset, router]);

  useEffect(() => {
    if (!user) return;

    Keyboard.dismiss();
    setAuthModal("none");
  }, [user]);

  useEffect(() => {
    if (authModal === "none") return;
    void api.warmup().catch(() => undefined);
  }, [authModal]);

  const closeAuth = () => {
    Keyboard.dismiss();
    setAuthModal("none");
  };

  const openLogin = () => {
    setAuthError("");
    setLoginEmail("");
    setLoginPassword("");
    setShowLoginPassword(false);
    setAuthModal("login");
  };

  const openRegister = () => {
    setAuthError("");
    setRegName("");
    setRegEmail("");
    setRegPassword("");
    setRegPasswordConfirm("");
    setShowRegPassword(false);
    setShowRegPasswordConfirm(false);
    setAuthModal("register");
  };

  const handleLogin = async () => {
    const email = normalizeEmail(loginEmail);
    if (!isValidEmail(email)) {
      setAuthError("Enter a valid email address.");
      return;
    }
    if (loginPassword.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError("");
      Keyboard.dismiss();
      await login(email, loginPassword);
      closeAuth();
    } catch (e: any) {
      setAuthError(e.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = normalizeEmail(loginEmail);
    if (!isValidEmail(email)) {
      const message = "Enter your email first.";
      setAuthError(message);
      showInfoTooltip("error", message);
      return;
    }

    try {
      setForgotPasswordLoading(true);
      setAuthError("");
      const response = await api.forgotPassword({ email });
      showInfoTooltip(
        "success",
        response.message || "Password reset instructions sent.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const message = e.message || "Could not request password reset.";
      setAuthError(message);
      showInfoTooltip("error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleRegister = async () => {
    const email = normalizeEmail(regEmail);
    if (!regName.trim()) {
      const message = "Enter your name.";
      showInfoTooltip("error", message);
      return;
    }
    if (!isValidEmail(email)) {
      const message = "Enter a valid email address.";
      showInfoTooltip("error", message);
      return;
    }
    if (regPassword.length < 8) {
      const message = "Password must be at least 8 characters.";
      showInfoTooltip("error", message);
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      const message = "Passwords do not match.";
      showInfoTooltip("error", message);
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError("");
      await signup(regName.trim(), email, regPassword);
      showInfoTooltip(
        "success",
        "Account created successfully. Please log in.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuthModal("login");
      setLoginEmail(email);
      setLoginPassword("");
    } catch (e: any) {
      const message = e.message || "Registration failed";
      showInfoTooltip("error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreate = () => {
    if (!user) {
      openLogin();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/room", params: { action: "create" } });
  };

  const handleJoin = () => {
    if (!user) {
      openLogin();
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/room",
      params: { action: "join", code: joinCode.trim().toUpperCase() },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#17092A", "#0E051A"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottomRight} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 32, paddingBottom: bottomPad + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/filmera-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>
              <Text style={styles.brandWhite}>FILM</Text>
              <Text style={styles.brandGold}>ERA</Text>
            </Text>
            <Text style={styles.tagline}>
              Decide what to watch,{"\n"}together.
            </Text>
          </View>

          {/* Auth bar */}
          {user ? (
            <View style={styles.authBar}>
              <Text
                style={[styles.authBarText, { color: colors.mutedForeground }]}
              >
                Signed in as{" "}
                <Text style={{ color: colors.foreground }}>{user.name}</Text>
              </Text>
              <View style={styles.authActions}>
                <Pressable onPress={() => router.push("/account-settings")}>
                  <Text style={[styles.authLink, { color: colors.accent }]}>
                    Account Settings
                  </Text>
                </Pressable>
                <Pressable onPress={logout}>
                  <Text
                    style={[
                      styles.authLink,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Sign out
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.authBar}>
              <Text
                style={[styles.authBarText, { color: colors.mutedForeground }]}
              >
                Sign in to create or join a room
              </Text>
              <Pressable onPress={openLogin}>
                <Text style={[styles.authLink, { color: colors.accent }]}>
                  Log in
                </Text>
              </Pressable>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#FFD600", "#FFE566"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Create a Room</Text>
              </LinearGradient>
            </Pressable>

            {mode !== "create" && (
              <Pressable
                style={({ pressed }) => [
                  styles.glassBtn,
                  {
                    backgroundColor:
                      mode === "join"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(255,255,255,0.06)",
                    borderColor:
                      mode === "join"
                        ? "rgba(255,255,255,0.3)"
                        : "rgba(255,255,255,0.12)",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                onPress={() => {
                  setMode(mode === "join" ? "none" : "join");
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[styles.glassBtnText, { color: colors.foreground }]}
                >
                  Join a Room
                </Text>
              </Pressable>
            )}

            {mode === "join" && (
              <View style={styles.joinSection}>
                <TextInput
                  style={[
                    styles.input,
                    styles.codeInput,
                    {
                      backgroundColor: "rgba(0,0,0,0.3)",
                      color: colors.accent,
                      borderColor: colors.accent,
                    },
                  ]}
                  placeholder="ROOM CODE"
                  placeholderTextColor={colors.mutedForeground}
                  value={joinCode}
                  onChangeText={(t) => setJoinCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={8}
                  returnKeyType="join"
                  onSubmitEditing={handleJoin}
                  autoFocus
                />
                <Pressable
                  onPress={handleJoin}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <LinearGradient
                    colors={["#FFD600", "#FFE566"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Join & Swipe →</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

          </View>

          {/* How it works */}
          <View
            style={[styles.howBox, { borderColor: "rgba(255,255,255,0.08)" }]}
          >
            {[
              { emoji: "🏠", text: "Create or join a room" },
              { emoji: "👆", text: "Swipe through movies together" },
              { emoji: "❤️", text: "Get an instant match" },
            ].map(({ emoji, text }) => (
              <View key={text} style={styles.howRow}>
                <Text style={styles.howEmoji}>{emoji}</Text>
                <Text
                  style={[styles.howText, { color: colors.mutedForeground }]}
                >
                  {text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth sheet */}
      {authModal !== "none" ? (
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={closeAuth}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={["#1E0F35", "#17092A"]}
                style={StyleSheet.absoluteFill}
              />
              <ScrollView
                contentContainerStyle={[
                  styles.modalContent,
                  { paddingBottom: bottomPad + 24 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalHandle} />

                {authModal === "login" ? (
                  <>
                    <Text style={styles.modalTitle}>Welcome back</Text>
                    <Text
                      style={[
                        styles.modalSub,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Log in to continue swiping.
                    </Text>
                    {authError ? (
                      <Text
                        style={[styles.errorText, { color: colors.dislike }]}
                      >
                        {authError}
                      </Text>
                    ) : null}

                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        EMAIL
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: "rgba(0,0,0,0.4)",
                            color: colors.foreground,
                            borderColor: "rgba(255,255,255,0.15)",
                          },
                        ]}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.mutedForeground}
                        value={loginEmail}
                        onChangeText={setLoginEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        PASSWORD
                      </Text>
                      <View style={styles.passwordInputWrap}>
                        <TextInput
                          style={[
                            styles.input,
                            styles.passwordInput,
                            {
                              backgroundColor: "rgba(0,0,0,0.4)",
                              color: colors.foreground,
                              borderColor: "rgba(255,255,255,0.15)",
                            },
                          ]}
                          placeholder="••••••••"
                          placeholderTextColor={colors.mutedForeground}
                          value={loginPassword}
                          onChangeText={setLoginPassword}
                          secureTextEntry={!showLoginPassword}
                        />
                        <Pressable
                          onPress={() =>
                            setShowLoginPassword((visible) => !visible)
                          }
                          style={styles.passwordToggle}
                          accessibilityRole="button"
                          accessibilityLabel={
                            showLoginPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <Feather
                            name={showLoginPassword ? "eye-off" : "eye"}
                            size={21}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={handleForgotPassword}
                        disabled={forgotPasswordLoading}
                        style={({ pressed }) => [
                          styles.forgotPasswordButton,
                          {
                            opacity:
                              forgotPasswordLoading || pressed ? 0.65 : 1,
                          },
                        ]}
                      >
                        {forgotPasswordLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.forgotPasswordText,
                              { color: colors.accent },
                            ]}
                          >
                            Forgot your password?
                          </Text>
                        )}
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={handleLogin}
                      disabled={authLoading}
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                      <LinearGradient
                        colors={["#FFD600", "#FFE566"]}
                        style={styles.primaryBtn}
                      >
                        {authLoading ? (
                          <ActivityIndicator color="#17092A" />
                        ) : (
                          <Text style={styles.primaryBtnText}>Log in</Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <Pressable onPress={openRegister} style={styles.switchRow}>
                      <Text
                        style={[
                          styles.switchText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Don't have an account?{" "}
                        <Text style={{ color: colors.accent }}>Create one</Text>
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Create your account</Text>
                    <Text
                      style={[
                        styles.modalSub,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Join FILMERA and start matching.
                    </Text>
                    {authError ? (
                      <Text
                        style={[styles.errorText, { color: colors.dislike }]}
                      >
                        {authError}
                      </Text>
                    ) : null}

                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        NAME
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: "rgba(0,0,0,0.4)",
                            color: colors.foreground,
                            borderColor: "rgba(255,255,255,0.15)",
                          },
                        ]}
                        placeholder="Your name"
                        placeholderTextColor={colors.mutedForeground}
                        value={regName}
                        onChangeText={setRegName}
                        autoCapitalize="words"
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        EMAIL
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: "rgba(0,0,0,0.4)",
                            color: colors.foreground,
                            borderColor: "rgba(255,255,255,0.15)",
                          },
                        ]}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.mutedForeground}
                        value={regEmail}
                        onChangeText={setRegEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        PASSWORD
                      </Text>
                      <View style={styles.passwordInputWrap}>
                        <TextInput
                          style={[
                            styles.input,
                            styles.passwordInput,
                            {
                              backgroundColor: "rgba(0,0,0,0.4)",
                              color: colors.foreground,
                              borderColor: "rgba(255,255,255,0.15)",
                            },
                          ]}
                          placeholder="Min 8 characters"
                          placeholderTextColor={colors.mutedForeground}
                          value={regPassword}
                          onChangeText={setRegPassword}
                          secureTextEntry={!showRegPassword}
                        />
                        <Pressable
                          onPress={() =>
                            setShowRegPassword((visible) => !visible)
                          }
                          style={styles.passwordToggle}
                          accessibilityRole="button"
                          accessibilityLabel={
                            showRegPassword ? "Hide password" : "Show password"
                          }
                        >
                          <Feather
                            name={showRegPassword ? "eye-off" : "eye"}
                            size={21}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.formField}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        CONFIRM PASSWORD
                      </Text>
                      <View style={styles.passwordInputWrap}>
                        <TextInput
                          style={[
                            styles.input,
                            styles.passwordInput,
                            {
                              backgroundColor: "rgba(0,0,0,0.4)",
                              color: colors.foreground,
                              borderColor:
                                regPasswordConfirm &&
                                regPassword !== regPasswordConfirm
                                  ? colors.dislike
                                  : "rgba(255,255,255,0.15)",
                            },
                          ]}
                          placeholder="Enter password again"
                          placeholderTextColor={colors.mutedForeground}
                          value={regPasswordConfirm}
                          onChangeText={setRegPasswordConfirm}
                          secureTextEntry={!showRegPasswordConfirm}
                        />
                        <Pressable
                          onPress={() =>
                            setShowRegPasswordConfirm((visible) => !visible)
                          }
                          style={styles.passwordToggle}
                          accessibilityRole="button"
                          accessibilityLabel={
                            showRegPasswordConfirm
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          <Feather
                            name={showRegPasswordConfirm ? "eye-off" : "eye"}
                            size={21}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      </View>
                      {regPasswordConfirm &&
                      regPassword !== regPasswordConfirm ? (
                        <Text
                          style={[styles.matchText, { color: colors.dislike }]}
                        >
                          Passwords do not match.
                        </Text>
                      ) : regPasswordConfirm ? (
                        <Text style={styles.matchSuccessText}>
                          Passwords match.
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.consentBlock}>
                      <Text
                        style={[
                          styles.consentText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        By creating an account, you agree to our{" "}
                        <Text
                          style={[styles.consentLink, { color: colors.accent }]}
                          onPress={() =>
                            Linking.openURL("https://filmera.us/privacy")
                          }
                          accessibilityRole="link"
                        >
                          Privacy Policy
                        </Text>
                      </Text>
                      <Text
                        style={[
                          styles.consentText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        and{" "}
                        <Text
                          style={[styles.consentLink, { color: colors.accent }]}
                          onPress={() =>
                            Linking.openURL("https://filmera.us/terms")
                          }
                          accessibilityRole="link"
                        >
                          Terms of Use
                        </Text>
                        .
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleRegister}
                      disabled={authLoading}
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                    >
                      <LinearGradient
                        colors={["#FFD600", "#FFE566"]}
                        style={styles.primaryBtn}
                      >
                        {authLoading ? (
                          <ActivityIndicator color="#17092A" />
                        ) : (
                          <Text style={styles.primaryBtnText}>
                            Create account
                          </Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <Pressable onPress={openLogin} style={styles.switchRow}>
                      <Text
                        style={[
                          styles.switchText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Already have an account?{" "}
                        <Text style={{ color: colors.accent }}>Log in</Text>
                      </Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A" },
  glowTop: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(115,13,165,0.35)",
    opacity: 0.6,
  },
  glowBottomRight: {
    position: "absolute",
    bottom: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,204,0,0.12)",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  brand: { alignItems: "center", gap: 10, paddingTop: 8 },
  logo: { width: 80, height: 80 },
  brandName: { fontSize: 42, letterSpacing: -1, lineHeight: 48 },
  brandWhite: { fontFamily: "Poppins_800ExtraBold", color: "#FDFBEF" },
  brandGold: { fontFamily: "Poppins_800ExtraBold", color: "#FFD600" },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#B8A8CC",
    textAlign: "center",
    lineHeight: 24,
  },
  authBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  authBarText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  authActions: { alignItems: "flex-end", gap: 8 },
  authLink: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { gap: 12 },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Poppins_800ExtraBold",
    color: "#17092A",
    letterSpacing: 0.3,
  },
  glassBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glassBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  joinSection: { gap: 12 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    fontFamily: "Poppins_800ExtraBold",
  },
  ghostBtn: { alignItems: "center", paddingVertical: 8 },
  ghostBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  howBox: { borderTopWidth: 1, paddingTop: 24, gap: 16 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  howEmoji: { fontSize: 20, width: 30, textAlign: "center" },
  howText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalKeyboardView: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Poppins_800ExtraBold",
    color: "#FDFBEF",
  },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  formField: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  passwordInputWrap: { position: "relative" },
  passwordInput: { paddingRight: 52 },
  passwordToggle: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotPasswordButton: {
    minHeight: 28,
    alignSelf: "flex-end",
    justifyContent: "center",
  },
  forgotPasswordText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  matchText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  matchSuccessText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#4ADE80",
  },
  consentBlock: { alignItems: "center" },
  consentText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textAlign: "center",
  },
  consentLink: { fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  switchRow: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
