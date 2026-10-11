import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Colors, FontSize, Spacing } from "../src/constants/theme";
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
            router.replace("/auth");
            return;
          }
        }
      } catch {
        // Stay on welcome screen if session check fails
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Nation of Niches</Text>
        <Text style={styles.subtitle}>
          A place built around the things you truly love.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.replace("/auth")}
        >
          <Text style={styles.buttonText}>Enter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  title: {
    fontSize: FontSize["2xl"],
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 999,
    minWidth: 180,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
