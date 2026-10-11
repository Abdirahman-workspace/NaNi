import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, FontSize, Spacing } from "../../src/constants/theme";
import { db } from "../../src/lib/db";
import type { Nano, Post } from "../../src/types/database";
import PostCard from "../../src/components/home/PostCard";

const tabs = ["For You", "Nano", "Following"] as const;
type Tab = (typeof tabs)[number];

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
    <View style={[styles.nanoSlide, { backgroundColor: nano.gradient || "#111" }]}>
      <View style={styles.nanoTop}>
        <View style={styles.nanoIdentity}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.nanoAvatar} />
          ) : (
            <View style={styles.nanoAvatarFallback}>
              <Text style={styles.nanoInitials}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.nanoName}>{displayName}</Text>
            <Text style={styles.nanoMeta}>@{username} · {relativeTime(nano.created_at)}</Text>
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
      </View>

      <View style={styles.nanoCenter}>
        <Ionicons name="play-circle-outline" size={64} color="rgba(255,255,255,.9)" />
      </View>

      <View style={styles.nanoBottom}>
        <View style={styles.nanoCaptionBlock}>
          <Text style={styles.nanoCaption}>{nano.caption}</Text>
          {!!nano.sound && (
            <View style={styles.soundRow}>
              <Ionicons name="musical-notes" size={14} color="#fff" />
              <Text style={styles.nanoSound} numberOfLines={1}>{nano.sound}</Text>
            </View>
          )}
        </View>
        <View style={styles.nanoActions}>
          <NanoAction icon="heart-outline" count={nano.likes_count} />
          <NanoAction icon="chatbubble-outline" count={nano.comments_count} />
          <NanoAction icon="share-outline" />
        </View>
      </View>
    </View>
  );
}

function NanoAction({ icon, count }: { icon: any; count?: number }) {
  return (
    <View style={styles.nanoAction}>
      <Ionicons name={icon} size={27} color="#fff" />
      {typeof count === "number" && <Text style={styles.nanoCount}>{count}</Text>}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
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
        if (active) setUnreadCount(notifications.filter((n) => !n.is_read).length);
      } catch (err) {
        console.warn("Failed to load notification count:", err);
      }
    })();
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: tab === "Nano"
        ? { display: "none" }
        : undefined,
    });
  }, [navigation, tab]);

  const chooseTab = (next: Tab) => {
    if (next === "Following") {
      router.push("/following");
      return;
    }
    setTab(next);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.text} />
          <Text style={styles.loadingText}>Syncing Niche Streams...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tab === "Nano") {
    return (
      <View style={styles.nanoContainer}>
        <SafeAreaView style={styles.nanoSafe} edges={["top"]}>
          <View style={styles.nanoHeader}>
            <Pressable style={styles.backButton} onPress={() => setTab("For You")}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.nanoHeaderTitle}>Nano</Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={styles.nanoTabs}>
            <Text style={styles.nanoTabActive}>For You</Text>
            <Text style={styles.nanoTab}>Following</Text>
          </View>

          {nanos.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="sparkles-outline" size={36} color="#777" />
              <Text style={styles.emptyTitle}>No Nanos available.</Text>
              <Text style={styles.emptyText}>Be the first to capture a Nano.</Text>
            </View>
          ) : (
            <FlatList
              data={nanos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <NanoSlide nano={item} />}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); load(); }}
                  tintColor="#fff"
                />
              }
            />
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.text}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.brand}>NaNi</Text>
              <Pressable style={styles.inboxButton} onPress={() => router.push("/inbox")} hitSlop={10}>
                <Ionicons name="mail-outline" size={21} color={Colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Pressable style={styles.searchBox} onPress={() => router.push("/search")}>
              <Ionicons name="search-outline" size={19} color={Colors.textMuted} />
              <Text style={styles.searchPlaceholder}>Search niches, creators...</Text>
            </Pressable>

            <View style={styles.tabs}>
              {tabs.map((item) => (
                <Pressable key={item} style={styles.tab} onPress={() => chooseTab(item)}>
                  <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
                  {tab === item && <View style={styles.indicator} />}
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyTitle}>No posts in feed yet.</Text>
            <Text style={styles.emptyText}>Be the first to create an aesthetic post in Nation of Niches.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#171717" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 12 },
  header: {
    height: 70,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { color: Colors.text, fontSize: 32, fontWeight: "500", letterSpacing: -1.2 },
  inboxButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#171717",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  searchBox: {
    marginHorizontal: 20,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.10)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchPlaceholder: { color: "rgba(255,255,255,.55)", fontSize: 15, fontWeight: "500" },
  tabs: {
    marginTop: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,.08)",
  },
  tab: { flex: 1, alignItems: "center", paddingBottom: 13, position: "relative" },
  tabText: { color: "rgba(255,255,255,.50)", fontSize: 16, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  indicator: { position: "absolute", bottom: -1, left: 14, right: 14, height: 2.5, borderRadius: 2, backgroundColor: Colors.accent },
  emptyFeed: { paddingHorizontal: 28, paddingVertical: 100, alignItems: "center" },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 },
  nanoContainer: { flex: 1, backgroundColor: "#000" },
  nanoSafe: { flex: 1, backgroundColor: "#000" },
  nanoHeader: { height: 82, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,.10)", borderWidth: 1, borderColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  nanoHeaderTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  nanoTabs: { position: "absolute", zIndex: 10, top: 88, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 26 },
  nanoTabActive: { color: "#fff", fontSize: 14, fontWeight: "800" },
  nanoTab: { color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: "700" },
  nanoSlide: { height: "100%", minHeight: 560, position: "relative", justifyContent: "space-between", padding: 20 },
  nanoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 50 },
  nanoIdentity: { flexDirection: "row", alignItems: "center" },
  nanoAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  nanoAvatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#333", alignItems: "center", justifyContent: "center", marginRight: 10 },
  nanoInitials: { color: "#fff", fontWeight: "800" },
  nanoName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  nanoMeta: { color: "rgba(255,255,255,.65)", fontSize: 12, marginTop: 2 },
  nanoCenter: { alignItems: "center", justifyContent: "center", flex: 1 },
  nanoBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 16 },
  nanoCaptionBlock: { flex: 1, paddingRight: 20 },
  nanoCaption: { color: "#fff", fontSize: 16, lineHeight: 23, fontWeight: "600" },
  soundRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  nanoSound: { color: "#fff", fontSize: 12, flex: 1 },
  nanoActions: { alignItems: "center", gap: 18 },
  nanoAction: { alignItems: "center", gap: 4 },
  nanoCount: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
