import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Animated, {
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";
import { Colors, FontSize, Spacing, Radii } from "../src/constants/theme";
import { db, isSupabaseConfigured } from "../src/lib/db";

export default function WelcomeScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const session = await db.auth.getSession();
          if (session && mounted) {
            router.replace("/(tabs)/home");
            return;
          }
        }
      } catch {
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.welcomeMid }]}>
        <ActivityIndicator size="large" color={Colors.welcomeText} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.welcomeBottom }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.welcomeTop, opacity: 0.55 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.welcomeMid, opacity: 0.45, top: "35%" }]} />
      <View style={styles.inner}>
        <View />
        <Animated.View entering={FadeInUp.duration(800).delay(80)} style={styles.hero}>
          <Text style={styles.welcomeLabel}>Welcome to</Text>
          <Text style={styles.title}>nation of niches</Text>
          <Text style={styles.subtitle}>
            A place built around the things you truly love.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(700).delay(400)} style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
            ]}
            onPress={() => router.replace("/auth")}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)/home")}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.secondaryLink}>Enter App</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.welcomeMid },
  inner: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing["6xl"],
  },
  hero: { alignItems: "center", gap: Spacing.sm, maxWidth: 340 },
  welcomeLabel: {
    fontSize: FontSize.lg,
    color: Colors.welcomeTextSoft,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: FontSize["3xl"],
    fontWeight: "500",
    color: Colors.welcomeText,
    textTransform: "uppercase",
    letterSpacing: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.welcomeTextMuted,
    textAlign: "center",
    lineHeight: 26,
    marginTop: Spacing.xs,
    maxWidth: 280,
  },
  actions: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: Spacing.lg,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: Radii.full,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  secondaryLink: {
    color: Colors.welcomeTextMuted,
    fontSize: FontSize.base,
    fontWeight: "500",
  },
});
