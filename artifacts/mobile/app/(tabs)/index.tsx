import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, login, signup, logout } = useAuth();

  const [authModal, setAuthModal] = useState<"none" | "login" | "register">("none");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [infoTooltip, setInfoTooltip] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [joinCode, setJoinCode] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

  useEffect(() => {
    if (!infoTooltip) return;
    const timeout = setTimeout(() => setInfoTooltip(null), 3200);
    return () => clearTimeout(timeout);
  }, [infoTooltip]);

  const showInfoTooltip = (type: "success" | "error", message: string) => {
    setInfoTooltip({ type, message });
  };

  const openLogin = () => {
    setAuthError("");
    setInfoTooltip(null);
    setLoginEmail("");
    setLoginPassword("");
    setAuthModal("login");
  };

  const openRegister = () => {
    setAuthError("");
    setInfoTooltip(null);
    setRegName("");
    setRegEmail("");
    setRegPassword("");
    setRegSuccess("");
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
      await login(email, loginPassword);
      setAuthModal("none");
    } catch (e: any) {
      setAuthError(e.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    const email = normalizeEmail(regEmail);
    if (!regName.trim()) {
      const message = "Enter your name.";
      setAuthError(message);
      showInfoTooltip("error", message);
      return;
    }
    if (!isValidEmail(email)) {
      const message = "Enter a valid email address.";
      setAuthError(message);
      showInfoTooltip("error", message);
      return;
    }
    if (regPassword.length < 8) {
      const message = "Password must be at least 8 characters.";
      setAuthError(message);
      showInfoTooltip("error", message);
      return;
    }
    try {
      setAuthLoading(true);
      setAuthError("");
      await signup(regName.trim(), email, regPassword);
      setRegSuccess("Account created! Please log in.");
      showInfoTooltip("success", "Account created successfully. Please log in.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuthModal("login");
      setLoginEmail(email);
      setLoginPassword("");
    } catch (e: any) {
      const message = e.message || "Registration failed";
      setAuthError(message);
      showInfoTooltip("error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreate = () => {
    if (!user) { openLogin(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/room", params: { action: "create" } });
  };

  const handleJoin = () => {
    if (!user) { openLogin(); return; }
    if (!joinCode.trim() || joinCode.trim().length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/room", params: { action: "join", code: joinCode.trim().toUpperCase() } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#17092A", "#0E051A"]} style={StyleSheet.absoluteFill} />
      {infoTooltip ? (
        <Pressable
          onPress={() => setInfoTooltip(null)}
          accessibilityRole="alert"
          style={[
            styles.infoTooltip,
            {
              top: topPad + 12,
              borderColor:
                infoTooltip.type === "success"
                  ? "rgba(74,222,128,0.55)"
                  : "rgba(255,107,107,0.6)",
            },
          ]}
        >
          <Text
            style={[
              styles.infoTooltipTitle,
              { color: infoTooltip.type === "success" ? "#4ADE80" : colors.dislike },
            ]}
          >
            {infoTooltip.type === "success" ? "Success" : "Error"}
          </Text>
          <Text style={styles.infoTooltipMessage}>{infoTooltip.message}</Text>
        </Pressable>
      ) : null}
      <View style={styles.glowTop} />
      <View style={styles.glowBottomRight} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 32, paddingBottom: bottomPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Image source={require("@/assets/images/filmera-logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brandName}>
              <Text style={styles.brandWhite}>Film</Text>
              <Text style={styles.brandGold}>era</Text>
            </Text>
            <Text style={styles.tagline}>Decide what to watch,{"\n"}together.</Text>
          </View>

          {/* Auth bar */}
          {user ? (
            <View style={styles.authBar}>
              <Text style={[styles.authBarText, { color: colors.mutedForeground }]}>
                Signed in as <Text style={{ color: colors.foreground }}>{user.name}</Text>
              </Text>
              <Pressable onPress={logout}>
                <Text style={[styles.authLink, { color: colors.accent }]}>Sign out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authBar}>
              <Text style={[styles.authBarText, { color: colors.mutedForeground }]}>
                Sign in to create or join a room
              </Text>
              <Pressable onPress={openLogin}>
                <Text style={[styles.authLink, { color: colors.accent }]}>Log in</Text>
              </Pressable>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                if (mode === "create") { handleCreate(); }
                else { setMode("create"); Haptics.selectionAsync(); }
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient colors={["#FFD600", "#FFE566"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{mode === "create" ? "Start Swiping →" : "Create a Room"}</Text>
              </LinearGradient>
            </Pressable>

            {mode !== "create" && (
              <Pressable
                style={({ pressed }) => [
                  styles.glassBtn,
                  {
                    backgroundColor: mode === "join" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)",
                    borderColor: mode === "join" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                onPress={() => { setMode(mode === "join" ? "none" : "join"); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.glassBtnText, { color: colors.foreground }]}>Join a Room</Text>
              </Pressable>
            )}

            {mode === "join" && (
              <View style={styles.joinSection}>
                <TextInput
                  style={[styles.input, styles.codeInput, { backgroundColor: "rgba(0,0,0,0.3)", color: colors.accent, borderColor: colors.accent }]}
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
                <Pressable onPress={handleJoin} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <LinearGradient colors={["#FFD600", "#FFE566"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Join & Swipe →</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {mode === "create" && (
              <Pressable style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => setMode("none")}>
                <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            )}
          </View>

          {/* How it works */}
          <View style={[styles.howBox, { borderColor: "rgba(255,255,255,0.08)" }]}>
            {[
              { emoji: "🏠", text: "Create or join a room" },
              { emoji: "👆", text: "Swipe through movies together" },
              { emoji: "❤️", text: "Get an instant match" },
            ].map(({ emoji, text }) => (
              <View key={text} style={styles.howRow}>
                <Text style={styles.howEmoji}>{emoji}</Text>
                <Text style={[styles.howText, { color: colors.mutedForeground }]}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Auth Modal */}
      <Modal visible={authModal !== "none"} transparent animationType="slide" onRequestClose={() => setAuthModal("none")}>
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAuthModal("none")}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <LinearGradient colors={["#1E0F35", "#17092A"]} style={StyleSheet.absoluteFill} />
              <ScrollView
                contentContainerStyle={[styles.modalContent, { paddingBottom: bottomPad + 24 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalHandle} />

                {authModal === "login" ? (
              <>
                <Text style={styles.modalTitle}>Welcome back</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Log in to continue swiping.</Text>
                {regSuccess ? <Text style={[styles.successText, { color: "#4ADE80" }]}>{regSuccess}</Text> : null}
                {authError ? <Text style={[styles.errorText, { color: colors.dislike }]}>{authError}</Text> : null}

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "rgba(0,0,0,0.4)", color: colors.foreground, borderColor: "rgba(255,255,255,0.15)" }]}
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
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "rgba(0,0,0,0.4)", color: colors.foreground, borderColor: "rgba(255,255,255,0.15)" }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry
                  />
                </View>

                <Pressable onPress={handleLogin} disabled={authLoading} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.primaryBtn}>
                    {authLoading ? <ActivityIndicator color="#17092A" /> : <Text style={styles.primaryBtnText}>Log in</Text>}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={openRegister} style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                    Don't have an account?{" "}
                    <Text style={{ color: colors.accent }}>Create one</Text>
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Create your account</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Join Filmera and start matching.</Text>
                {authError ? <Text style={[styles.errorText, { color: colors.dislike }]}>{authError}</Text> : null}

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "rgba(0,0,0,0.4)", color: colors.foreground, borderColor: "rgba(255,255,255,0.15)" }]}
                    placeholder="Your name"
                    placeholderTextColor={colors.mutedForeground}
                    value={regName}
                    onChangeText={setRegName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "rgba(0,0,0,0.4)", color: colors.foreground, borderColor: "rgba(255,255,255,0.15)" }]}
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
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PASSWORD</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: "rgba(0,0,0,0.4)", color: colors.foreground, borderColor: "rgba(255,255,255,0.15)" }]}
                    placeholder="Min 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                  />
                </View>

                <Pressable onPress={handleRegister} disabled={authLoading} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <LinearGradient colors={["#FFD600", "#FFE566"]} style={styles.primaryBtn}>
                    {authLoading ? <ActivityIndicator color="#17092A" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={openLogin} style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A" },
  glowTop: {
    position: "absolute", top: -80, left: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: "rgba(115,13,165,0.35)", opacity: 0.6,
  },
  glowBottomRight: {
    position: "absolute", bottom: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(255,204,0,0.12)",
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  brand: { alignItems: "center", gap: 10, paddingTop: 8 },
  logo: { width: 80, height: 80 },
  brandName: { fontSize: 42, letterSpacing: -1, lineHeight: 48 },
  brandWhite: { fontFamily: "Poppins_800ExtraBold", color: "#FDFBEF" },
  brandGold: { fontFamily: "Poppins_800ExtraBold", color: "#FFD600" },
  tagline: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#B8A8CC", textAlign: "center", lineHeight: 24 },
  authBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  authBarText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  authLink: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { gap: 12 },
  primaryBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 16, fontFamily: "Poppins_800ExtraBold", color: "#17092A", letterSpacing: 0.3 },
  glassBtn: { height: 54, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  glassBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  joinSection: { gap: 12 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  codeInput: { textAlign: "center", fontSize: 22, letterSpacing: 8, fontFamily: "Poppins_800ExtraBold" },
  ghostBtn: { alignItems: "center", paddingVertical: 8 },
  ghostBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  howBox: { borderTopWidth: 1, paddingTop: 24, gap: 16 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  howEmoji: { fontSize: 20, width: 30, textAlign: "center" },
  howText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoTooltip: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(14,5,26,0.96)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  infoTooltipTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  infoTooltipMessage: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium", color: "#FDFBEF" },
  modalKeyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
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
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 24, fontFamily: "Poppins_800ExtraBold", color: "#FDFBEF" },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  formField: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  successText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  switchRow: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
