import { Feather } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type TooltipType = "success" | "error";

interface TooltipState {
  type: TooltipType;
  message: string;
}

interface InfoToolTipContextValue {
  showInfoTooltip: (type: TooltipType, message: string) => void;
  closeInfoTooltip: () => void;
}

const InfoToolTipContext = createContext<InfoToolTipContextValue | null>(null);

export function InfoToolTipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showInfoTooltip = useCallback(
    (type: TooltipType, message: string) => setTooltip({ type, message }),
    [],
  );
  const closeInfoTooltip = useCallback(() => setTooltip(null), []);
  const value = useMemo(
    () => ({ showInfoTooltip, closeInfoTooltip }),
    [closeInfoTooltip, showInfoTooltip],
  );

  const isSuccess = tooltip?.type === "success";

  return (
    <InfoToolTipContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(tooltip)}
        transparent
        animationType="fade"
        onRequestClose={closeInfoTooltip}
      >
        <Pressable style={styles.overlay} onPress={closeInfoTooltip}>
          <Pressable
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[
              styles.panel,
              {
                borderColor: isSuccess
                  ? "rgba(255,214,0,0.45)"
                  : "rgba(244,63,94,0.45)",
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Pressable
              onPress={closeInfoTooltip}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close message"
            >
              <Feather name="x" size={22} color="#B8A8CC" />
            </Pressable>

            <View
              style={[
                styles.iconCircle,
                {
                  borderColor: isSuccess ? "#FFD600" : "#F43F5E",
                },
              ]}
            >
              <Text
                style={[
                  styles.icon,
                  { color: isSuccess ? "#FFD600" : "#F43F5E" },
                ]}
              >
                {isSuccess ? "✓" : "✗"}
              </Text>
            </View>
            <Text
              style={[
                styles.message,
                { color: isSuccess ? "#FFD600" : "#FDFBEF" },
              ]}
            >
              {tooltip?.message}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </InfoToolTipContext.Provider>
  );
}

export function useInfoToolTip() {
  const context = useContext(InfoToolTipContext);
  if (!context) {
    throw new Error("useInfoToolTip must be used inside InfoToolTipProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.76)",
  },
  panel: {
    position: "relative",
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(23,9,42,0.98)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
    borderWidth: 4,
  },
  icon: {
    fontSize: 58,
    lineHeight: 66,
    fontFamily: "Poppins_800ExtraBold",
  },
  message: {
    fontSize: 20,
    lineHeight: 30,
    fontFamily: "Poppins_800ExtraBold",
    textAlign: "center",
  },
});
