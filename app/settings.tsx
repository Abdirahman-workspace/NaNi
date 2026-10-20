import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  FontSize,
  FontWeight,
  Radii,
  Spacing,
} from "../src/constants/theme";
import { db, isSupabaseConfigured } from "../src/lib/db";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
// Lighter than Colors.danger so the label keeps readable contrast on the red tint.
const SIGN_OUT_RED = "#f87171";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const user = await db.auth.getUser();
        if (mounted) setEmail(user?.email ?? null);
      } catch {
        // The account row is optional, so leave it hidden if the lookup fails.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const performSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await db.auth.signOut();
      // Close this modal, then replace the tabs underneath so Back can't return to them.
      if (router.canDismiss()) router.dismissAll();
      router.replace("/auth");
    } catch (e: any) {
      setSigningOut(false);
      Alert.alert(
        "Couldn't sign out",
        e?.message ?? "Check your connection and try again."
      );
    }
  };

  const confirmSignOut = () => {
    // Alert buttons don't render on web, so skip the prompt there.
    if (Platform.OS === "web") {
      performSignOut();
      return;
    }

    Alert.alert(
      "Sign out?",
      "You'll need to sign in again to post, like or follow.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: performSignOut },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close settings"
            >
              <Text style={styles.done}>Done</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
      >
        {email ? (
          <View style={styles.card}>
            <Text style={styles.caption}>Signed in as</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Service status</Text>
            <View style={styles.pill}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isSupabaseConfigured
                      ? Colors.success
                      : Colors.textMuted,
                  },
                ]}
              />
              <Text style={styles.pillText}>
                {isSupabaseConfigured ? "Connected" : "Offline"}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {isSupabaseConfigured
              ? "Your profile, posts and follows sync with the cloud."
              : "The app isn't connected to its backend, so nothing will load or save."}
          </Text>
        </View>

        <Pressable
          onPress={confirmSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
          style={({ pressed }) => [
            styles.signOut,
            (pressed || signingOut) && styles.signOutActive,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color={SIGN_OUT_RED} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={SIGN_OUT_RED} />
              <Text style={styles.signOutText}>Sign out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  done: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii["2xl"],
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontFamily: MONO,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  email: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 19,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontFamily: MONO,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radii["2xl"],
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  signOutActive: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  signOutText: {
    color: SIGN_OUT_RED,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});
