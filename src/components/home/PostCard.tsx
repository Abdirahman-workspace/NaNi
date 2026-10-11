import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, FontSize, Spacing } from "../../constants/theme";
import { db } from "../../lib/db";
import type { Post } from "../../types/database";

type Props = { post: Post; onChanged?: () => void };

function relativeTime(value?: string) {
  if (!value) return "Just now";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export default function PostCard({ post }: Props) {
  const profile = post.profiles;
  const username = profile?.username ?? "user";
  const displayName = profile?.display_name || username;
  const initials = useMemo(
    () => displayName.trim().slice(0, 1).toUpperCase() || "U",
    [displayName],
  );

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  const content = post.content ?? "";
  const isLong = content.length > 160;
  const visibleContent = expanded || !isLong ? content : `${content.slice(0, 160).trim()}…`;

  useEffect(() => {
    let active = true;
    setLikes(post.likes_count ?? 0);

    (async () => {
      try {
        const user = await db.auth.getUser();
        if (!user || !active) return;
        const value = await db.posts.isLikedBy(post.id, user.id);
        if (active) setLiked(value);
      } catch {
        // A missing/temporary auth connection should not prevent the feed from rendering.
      }
    })();

    return () => {
      active = false;
    };
  }, [post.id, post.likes_count]);

  const toggleLike = async () => {
    const user = await db.auth.getUser();
    if (!user) return;

    const previousLiked = liked;
    const previousLikes = likes;
    const optimistic = !previousLiked;
    setLiked(optimistic);
    setLikes(Math.max(0, previousLikes + (optimistic ? 1 : -1)));

    try {
      const result = await db.posts.likeToggle(post.id, user.id);
      setLiked(result);
      setLikes(Math.max(0, previousLikes + (result ? 1 : -1)));
    } catch {
      setLiked(previousLiked);
      setLikes(previousLikes);
    }
  };

  const sharePost = async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: `${displayName} on NaNi\n\n${content}`,
      });
    } catch {
      // User cancellation is intentionally ignored.
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.identity}
          onPress={() => router.push(`/profile/${username}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${displayName}'s profile`}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {profile?.is_creator ? (
                <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              @{username} · {relativeTime(post.created_at)}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setMenuVisible(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More post options"
        >
          <Ionicons name="ellipsis-horizontal" size={21} color={Colors.textMuted} />
        </Pressable>
      </View>

      {post.type !== "post" ? (
        <View style={styles.typePill}>
          <Ionicons
            name={post.type === "music" ? "musical-notes-outline" : "document-text-outline"}
            size={13}
            color={Colors.textSecondary}
          />
          <Text style={styles.typeText}>{post.type === "music" ? "Music" : "Note"}</Text>
        </View>
      ) : null}

      {content ? (
        <Pressable
          onPress={() => isLong && setExpanded((value) => !value)}
          disabled={!isLong}
          accessibilityRole={isLong ? "button" : undefined}
        >
          <Text style={styles.content}>{visibleContent}</Text>
          {isLong ? (
            <Text style={styles.more}>{expanded ? "Show less" : "Read more"}</Text>
          ) : null}
        </Pressable>
      ) : null}

      {post.captured_image ? (
        <Image
          source={{ uri: post.captured_image }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : post.image_gradient ? (
        <View style={styles.mediaPlaceholder}>
          <Ionicons name="color-palette-outline" size={30} color={Colors.textMuted} />
        </View>
      ) : null}

      {post.sound ? (
        <View style={styles.soundRow}>
          <Ionicons name="musical-notes" size={14} color={Colors.textSecondary} />
          <Text style={styles.sound} numberOfLines={1}>{post.sound}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={toggleLike} hitSlop={5}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={22}
            color={liked ? Colors.danger : Colors.textSecondary}
          />
          <Text style={[styles.actionText, liked && styles.likedText]}>{formatCount(likes)}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={() => setCommentsVisible(true)} hitSlop={5}>
          <Ionicons name="chatbubble-outline" size={21} color={Colors.textSecondary} />
          <Text style={styles.actionText}>{formatCount(post.comments_count ?? 0)}</Text>
        </Pressable>

        <Pressable
          style={styles.action}
          onPress={() => setReposted((value) => !value)}
          hitSlop={5}
          accessibilityLabel="Repost"
        >
          <Ionicons
            name="repeat-outline"
            size={22}
            color={reposted ? Colors.accent : Colors.textSecondary}
          />
        </Pressable>

        <Pressable
          style={styles.action}
          onPress={() => setBookmarked((value) => !value)}
          hitSlop={5}
          accessibilityLabel="Bookmark"
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={21}
            color={bookmarked ? Colors.accent : Colors.textSecondary}
          />
        </Pressable>

        <Pressable style={styles.action} onPress={sharePost} hitSlop={5} accessibilityLabel="Share post">
          <Ionicons name="share-outline" size={21} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <Modal
        transparent
        visible={menuVisible}
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <View style={styles.handle} />
            <Text style={styles.menuTitle}>Post options</Text>
            <Pressable style={styles.menuItem} onPress={sharePost}>
              <Ionicons name="share-outline" size={20} color={Colors.text} />
              <Text style={styles.menuText}>Share</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Ionicons name="flag-outline" size={20} color={Colors.text} />
              <Text style={styles.menuText}>Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={commentsVisible}
        animationType="slide"
        onRequestClose={() => setCommentsVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.commentsSheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Pressable onPress={() => setCommentsVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <View style={styles.commentsEmpty}>
              <Ionicons name="chatbubble-ellipses-outline" size={34} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No comments yet.</Text>
              <Text style={styles.emptyText}>The comments drawer will be connected next.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", marginRight: 12 },
  identityText: { flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10, backgroundColor: Colors.surfaceElevated },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: Colors.text, fontSize: FontSize.sm, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, color: Colors.text, fontSize: FontSize.sm, fontWeight: "800" },
  meta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  typePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 7,
    borderRadius: 999,
    backgroundColor: Colors.surfaceElevated,
  },
  typeText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: "700" },
  content: { color: Colors.text, fontSize: FontSize.md, lineHeight: 23 },
  more: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: "700", marginTop: 4 },
  postImage: { width: "100%", aspectRatio: 1, borderRadius: 14, marginTop: Spacing.sm, backgroundColor: Colors.surfaceElevated },
  mediaPlaceholder: {
    height: 220,
    borderRadius: 14,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  soundRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.sm },
  sound: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.xs },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Spacing.md },
  action: { minWidth: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: "600" },
  likedText: { color: Colors.danger },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" },
  menu: { backgroundColor: Colors.surfaceElevated, padding: Spacing.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: Spacing.md },
  menuTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: "800", marginBottom: Spacing.sm },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  menuText: { color: Colors.text, fontSize: FontSize.md, fontWeight: "600" },
  commentsSheet: { minHeight: "55%", backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.md },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: Spacing.md },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: "800" },
  commentsEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 40 },
  emptyTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: "800", marginTop: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: "center", marginTop: 5 },
});
