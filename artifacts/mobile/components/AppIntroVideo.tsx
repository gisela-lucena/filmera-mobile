import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AppIntroVideoProps {
  onFinish: () => void;
}

export function AppIntroVideo({ onFinish }: AppIntroVideoProps) {
  const finished = useRef(false);
  const player = useVideoPlayer(
    require("@/assets/videos/filmera-intro.mp4"),
    (videoPlayer) => {
      videoPlayer.loop = false;
      videoPlayer.play();
    },
  );

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  useEventListener(player, "playToEnd", finish);
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "error") finish();
  });

  useEffect(() => {
    const fallbackTimer = setTimeout(finish, 15_000);
    return () => clearTimeout(fallbackTimer);
  }, [finish]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
        hitSlop={12}
        onPress={finish}
        style={({ pressed }) => [
          styles.skipButton,
          { opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#0E051A",
  },
  skipButton: {
    position: "absolute",
    top: 56,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(14,5,26,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  skipText: {
    color: "#FDFBEF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
