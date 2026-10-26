import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Colors,
  FontSize,
  FontWeight,
  Radii,
  Spacing,
} from "../../src/constants/theme";
import { db } from "../../src/lib/db";
import type { Nano, Post } from "../../src/types/database";
import PostCard from "../../src/components/home/PostCard";

const tabs = ["For You", "Nano", "Following"] as const;
type Tab = (typeof tabs)[number];
const SCREEN_H = Dimensions.get("window").height;

function relativeTime(value?: string) {
  if (!value) return "Just now";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function NanoSlide({ nano }: { nano: Nano }) {
  const profile = nano.profiles;
  const username = profile?.username ?? "user";
  const displayName = profile?.display_name ?? username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.nanoSlide, { height: SCREEN_H }]}>
      <View style={styles.nanoGradient}>
        <View style={styles.nanoTop}>
          <Pressable
            style={styles.nanoIdentity}
            onPress={() => router.push(`/profile/${username}` as any)}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.nanoAvatar} />
            ) : (
              <View style={styles.nanoAvatarFallback}>
                <Text style={styles.nanoInitials}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.nanoName}>{displayName}</Text>
              <Text style={styles.nanoMeta}>
                @{username} · {relativeTime(nano.created_at)}
              </Text>
            </View>
          </Pressable>
          <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
        </View>

        <View style={styles.nanoCenter}>
          <Ionicons name="play-circle-outline" size={72} color="rgba(255,255,255,0.9)" />
        </View>

        <View style={styles.nanoBottom}>
          <View style={styles.nanoCaptionBlock}>
            <Text style={styles.nanoCaption}>{nano.caption}</Text>
            {!!nano.sound && (
              <View style={styles.soundRow}>
                <Ionicons name="musical-notes" size={14} color="#fff" />
                <Text style={styles.nanoSound} numberOfLines={1}>
                  {nano.sound}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.nanoActions}>
            <View style={styles.nanoAction}>
              <Ionicons name="heart-outline" size={28} color="#fff" />
              <Text style={styles.nanoCount}>{nano.likes_count ?? 0}</Text>
            </View>
            <View style={styles.nanoAction}>
              <Ionicons name="chatbubble-outline" size={26} color="#fff" />
              <Text style={styles.nanoCount}>{nano.comments_count ?? 0}</Text>
            </View>
            <View style={styles.nanoAction}>
              <Ionicons name="share-outline" size={26} color="#fff" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>("For You");
  const [posts, setPosts] = useState<Post[]>([]);
  const [nanos, setNanos] = useState<Nano[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postData, nanoData] = await Promise.all([
        db.posts.list(30),
        db.nanos.list(30),
      ]);
      setPosts(postData);
      setNanos(nanoData);
    } catch (err) {
      console.warn("Failed to load Home feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const userId = await db.auth.getCurrentUserId();
        if (!userId) return;
        const notifications = await db.notifications.list(userId);
        if (active) {
          setUnreadCount(notifications.filter((n) => !n.is_read).length);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, []);

  const chooseTab = (next: Tab) => {
    if (next === "Following") {
      router.push("/(tabs)/following");
      return;
    }
    setTab(next);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Syncing Niche Streams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ——— Nano full-screen mode (web parity) ———
  if (tab === "Nano") {
    return (
      <View style={styles.nanoContainer}>
        <SafeAreaView style={styles.nanoSafe} edges={["top"]}>
          <View style={styles.nanoHeader}>
            <Pressable
              style={styles.backButton}
              onPress={() => setTab("For You")}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.nanoHeaderTitle}>Nano</Text>
            <View style={{ width: 42 }} />
          </View>
        </SafeAreaView>

        {nanos.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No Nanos yet</Text>
            <Text style={styles.emptyText}>Create one from the + menu.</Text>
          </View>
        ) : (
          <FlatList
            data={nanos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NanoSlide nano={item} />}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={SCREEN_H}
            decelerationRate="fast"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor="#fff"
              />
            }
          />
        )}
      </View>
    );
  }

  // ——— For You feed ———
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.text}
          />
        }
        ListHeaderComponent={
          <>
            {/* Brand + Inbox — web style */}
            <View style={styles.header}>
              <Text style={styles.brand}>NaNi</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.inboxButton,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => router.push("/inbox")}
                hitSlop={10}
              >
                <Ionicons name="mail-outline" size={20} color={Colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Search pill — web style */}
            <Pressable
              style={({ pressed }) => [
                styles.searchBox,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Ionicons name="search" size={20} color={Colors.textSecondary} />
              <Text style={styles.searchPlaceholder}>Search niches, creators...</Text>
            </Pressable>

            {/* Tabs — 3 columns like web */}
            <View style={styles.tabs}>
              {tabs.map((item, idx) => {
                const active = tab === item;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.tab,
                      idx === 0 && styles.tabStart,
                      idx === 1 && styles.tabCenter,
                      idx === 2 && styles.tabEnd,
                    ]}
                    onPress={() => chooseTab(item)}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {item}
                    </Text>
                    {active && <View style={styles.indicator} />}
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyTitle}>No posts in feed yet.</Text>
            <Text style={styles.emptyText}>
              Be the first to create an aesthetic post in Nation of Niches.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: 120 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 12,
  },
  header: {
    height: 70,
    paddingHorizontal: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: -1.2,
  },
  inboxButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: FontWeight.extrabold,
  },
  searchBox: {
    marginHorizontal: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: Radii.full,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchPlaceholder: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: FontWeight.medium,
  },
  tabs: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.xl,
  },
  tab: { flex: 1, paddingBottom: 12, alignItems: "center" },
  tabStart: { alignItems: "flex-start" },
  tabCenter: { alignItems: "center" },
  tabEnd: { alignItems: "flex-end" },
  tabText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: FontWeight.semibold,
  },
  tabTextActive: { color: Colors.text, fontWeight: FontWeight.bold },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 2.5,
    width: 28,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  emptyFeed: {
    paddingHorizontal: 28,
    paddingVertical: 100,
    alignItems: "center",
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
  nanoContainer: { flex: 1, backgroundColor: "#000" },
  nanoSafe: { backgroundColor: "#000" },
  nanoHeader: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  nanoHeaderTitle: { color: "#fff", fontSize: 20, fontWeight: FontWeight.extrabold },
  nanoSlide: { width: "100%", backgroundColor: "#0d0614" },
  nanoGradient: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#1a1025",
  },
  nanoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  nanoIdentity: { flexDirection: "row", alignItems: "center" },
  nanoAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  nanoAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  nanoInitials: { color: "#fff", fontWeight: FontWeight.extrabold },
  nanoName: { color: "#fff", fontSize: 14, fontWeight: FontWeight.extrabold },
  nanoMeta: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  nanoCenter: { alignItems: "center", justifyContent: "center", flex: 1 },
  nanoBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 100,
  },
  nanoCaptionBlock: { flex: 1, paddingRight: 20 },
  nanoCaption: { color: "#fff", fontSize: 16, lineHeight: 23, fontWeight: "600" },
  soundRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  nanoSound: { color: "#fff", fontSize: 12, flex: 1 },
  nanoActions: { alignItems: "center", gap: 22 },
  nanoAction: { alignItems: "center", gap: 4 },
  nanoCount: { color: "#fff", fontSize: 12, fontWeight: FontWeight.bold },
});
