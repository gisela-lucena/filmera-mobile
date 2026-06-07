import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { api } from "@/services/api";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(
    () => (Array.isArray(params.token) ? params.token[0] : params.token) || "",
    [params.token],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasConfirmation = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;
  const isFormValid =
    /^[a-f0-9]{64}$/i.test(token) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    passwordsMatch;

  const handleSubmit = async () => {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError("Reset link is invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await api.resetPassword({ token, password });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: "/", params: { passwordReset: "success" } });
    } catch (requestError: any) {
      setError(requestError.message || "Could not reset password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#17092A", "#0E051A"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 48,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>
            <Text style={styles.brandWhite}>FILM</Text>
            <Text style={styles.brandGold}>ERA</Text>
          </Text>

          <View style={styles.panel}>
            <Text style={styles.title}>Reset password</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Create a new password for your account.
            </Text>
            {error ? (
              <Text style={[styles.error, { color: colors.dislike }]}>
                {error}
              </Text>
            ) : null}

            <PasswordField
              label="NEW PASSWORD"
              placeholder="Min 8 characters"
              value={password}
              onChangeText={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />
            <PasswordField
              label="CONFIRM PASSWORD"
              placeholder="Enter password again"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              invalid={hasConfirmation && !passwordsMatch}
            />

            {hasConfirmation ? (
              <Text
                style={[
                  styles.validation,
                  { color: passwordsMatch ? "#4ADE80" : colors.dislike },
                ]}
              >
                {passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              style={({ pressed }) => [
                {
                  opacity:
                    !isFormValid || isSubmitting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={["#FFD600", "#FFE566"]}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#17092A" />
                ) : (
                  <Text style={styles.submitText}>Save new password</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.replace("/")} style={styles.back}>
              <Text style={[styles.backText, { color: colors.accent }]}>
                Back to login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  visible,
  onToggle,
  invalid = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  invalid?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: invalid ? colors.dislike : "rgba(255,255,255,0.15)",
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          autoComplete="new-password"
        />
        <Pressable
          onPress={onToggle}
          style={styles.eyeButton}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Feather
            name={visible ? "eye-off" : "eye"}
            size={21}
            color={colors.mutedForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E051A" },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  brand: {
    alignSelf: "center",
    fontSize: 30,
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: 1,
  },
  brandWhite: { color: "#FDFBEF" },
  brandGold: { color: "#FFD600" },
  panel: {
    gap: 16,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(30,15,53,0.94)",
  },
  title: {
    fontSize: 26,
    fontFamily: "Poppins_800ExtraBold",
    color: "#FDFBEF",
  },
  subtitle: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  error: { fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { gap: 7 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  passwordWrap: { position: "relative" },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 52,
    backgroundColor: "rgba(0,0,0,0.4)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  eyeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  validation: { marginTop: -8, fontSize: 12, fontFamily: "Inter_400Regular" },
  submitButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#17092A",
    fontSize: 16,
    fontFamily: "Poppins_800ExtraBold",
  },
  back: { alignItems: "center", paddingVertical: 4 },
  backText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
