import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import type { Post } from "../../src/types/database";
import PostCard from "../../src/components/home/PostCard";

const tabs = ["For You", "Nano", "Following"] as const;

export default function FollowingScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const myId = await db.auth.getCurrentUserId();
      if (!myId) {
        setPosts([]);
        return;
      }

      // Unread count
      try {
        const notifications = await db.notifications.list(myId);
        setUnreadCount(notifications.filter((n: any) => !n.is_read).length);
      } catch {}

      // People I follow
      const followingUsers = await db.follows.listFollowing(myId);
      const followingIds = new Set(followingUsers.map((u: any) => u.id));

      // Posts from people I follow
      const allPosts = await db.posts.list(50);
      const filtered = allPosts.filter((p: any) => followingIds.has(p.user_id));
      setPosts(filtered);
    } catch (err) {
      console.warn("Failed to load Following feed:", err);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chooseTab = (tab: string) => {
    if (tab === "For You") {
      router.push("/(tabs)/home");
    } else if (tab === "Nano") {
      router.push("/(tabs)/home"); // Home handles Nano mode
    }
    // Already on Following
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading following feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            {/* Header – same as Home */}
            <View style={styles.header}>
              <Text style={styles.brand}>NaNi</Text>
              <Pressable
                style={styles.inboxButton}
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

            {/* Search – same as Home */}
            <Pressable
              style={styles.searchBox}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.textMuted}
              />
              <Text style={styles.searchPlaceholder}>
                Search niches, creators...
              </Text>
            </Pressable>

            {/* Tabs – same as Home, Following active */}
            <View style={styles.tabs}>
              {tabs.map((item) => (
                <Pressable
                  key={item}
                  style={styles.tab}
                  onPress={() => chooseTab(item)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      item === "Following" && styles.tabTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === "Following" && <View style={styles.indicator} />}
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={40}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Follow creators to see their posts here.
            </Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Text style={styles.exploreBtnText}>Find people</Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },

  // Header
  header: {
    height: 64,
    paddingHorizontal: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: FontWeight.bold,
    letterSpacing: -1.1,
  },
  inboxButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  // Search
  searchBox: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    height: 44,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPlaceholder: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  tab: {
    marginRight: 28,
    paddingVertical: 12,
    position: "relative",
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: FontWeight.bold,
    marginTop: 12,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  exploreBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radii.xl,
    backgroundColor: Colors.accent,
  },
  exploreBtnText: {
    color: Colors.accentForeground,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
