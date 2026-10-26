import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent} from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "../../constants/theme";
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
  if (value >= 1_000_000) return `\( {(value / 1_000_000).toFixed(1).replace(/\.0 \)/, "")}m`;
  if (value >= 1000) return `\( {(value / 1000).toFixed(1).replace(/\.0 \)/, "")}k`;
  return String(value);
}

/** Highlight #hashtags and @mentions like web (emerald) */
function FormattedText({ text, style }: { text: string; style?: any }) {
  const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith("#") || part.startsWith("@")) {
          return (
            <Text
              key={i}
              style={styles.mention}
              onPress={() => {
                if (part.startsWith("@")) {
                  router.push(`/profile/${part.slice(1)}` as any);
                } else {
                  router.push("/(tabs)/search" as any);
                }
              }}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}


function getPostMedia(post: any): { uri: string; type: "photo" | "video" }[] {
  if (Array.isArray(post?.media_items) && post.media_items.length) {
    return post.media_items
      .map((m: any) => ({
        uri: m.uri || m.url,
        type: (m.mediaType === "video" || m.type === "video" ? "video" : "photo") as "photo" | "video",
      }))
      .filter((m: any) => !!m.uri);
  }
  if (Array.isArray(post?.media_urls) && post.media_urls.length) {
    return post.media_urls.filter(Boolean).map((uri: string) => ({
      uri,
      type: "photo" as const,
    }));
  }
  const single = post?.captured_image || post?.image_url || post?.media_url;
  if (single) return [{ uri: single, type: "photo" }];
  return [];
}


function MediaSlide({
  uri,
  type,
  width,
  active,
}: {
  uri: string;
  type: "photo" | "video";
  width: number;
  active: boolean;
}) {
  const player = useVideoPlayer(type === "video" ? uri : null, (p) => {
    if (!p) return;
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (type !== "video" || !player) return;
    try {
      if (active) player.play();
      else player.pause();
    } catch {}
  }, [active, player, type]);

  if (type === "video" && player) {
    return (
      <View style={{ width, backgroundColor: "#000" }}>
        <VideoView
          player={player}
          style={styles.postImage}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeTxt}>Video</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      <Image source={{ uri }} style={styles.postImage} resizeMode="cover" />
    </View>
  );
}

export default function PostCard({ post }: Props) {
  const profile = post.profiles;
  const username = profile?.username ?? "user";
  const displayName = profile?.display_name || username;
  const initials = useMemo(
    () => displayName.trim().slice(0, 1).toUpperCase() || "U",
    [displayName]
  );

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes_count ?? 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  const content = post.content ?? "";
  const maxLength = 110;
  const isLong = content.length > maxLength;
  const visibleContent =
    expanded || !isLong ? content : `${content.slice(0, maxLength).trim()}…`;

  useEffect(() => {
    let active = true;
    setLikes(post.likes_count ?? 0);
    (async () => {
      try {
        const user = await db.auth.getUser();
        if (!user || !active) return;
        const value = await db.posts.isLikedBy(post.id, user.id);
        if (active) setLiked(value);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [post.id, post.likes_count]);

  const toggleLike = async () => {
    try {
      const user = await db.auth.getUser();
      if (!user) return;
      const previousLiked = liked;
      const previousLikes = likes;
      setLiked(!previousLiked);
      setLikes(previousLiked ? Math.max(0, previousLikes - 1) : previousLikes + 1);
      try {
        const next = await db.posts.likeToggle(post.id, user.id);
        setLiked(next);
      } catch {
        setLiked(previousLiked);
        setLikes(previousLikes);
      }
    } catch {}
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${displayName}: ${content.slice(0, 120)}`,
      });
    } catch {}
  };

  const mediaList = getPostMedia(post);
  const [mediaIndex, setMediaIndex] = useState(0);
  const mediaWidth = Dimensions.get("window").width;


  return (
    <View style={styles.card}>
      {/* Header — web: px-5 py-2, avatar 40, bold name */}
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [styles.identity, pressed && { opacity: 0.85 }]}
          onPress={() => router.push(`/profile/${username}` as any)}
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
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {profile?.is_creator ? (
                <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
              ) : null}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              @{username} · {relativeTime(post.created_at)}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => setMenuVisible(true)} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textMuted} />
        </Pressable>
      </View>

      {post.type && post.type !== "post" ? (
        <View style={styles.typePill}>
          <Ionicons
            name={post.type === "music" ? "musical-notes-outline" : "document-text-outline"}
            size={13}
            color={Colors.textSecondary}
          />
          <Text style={styles.typeText}>
            {post.type === "music" ? "Music" : "Note"}
          </Text>
        </View>
      ) : null}

      {content ? (
        <Pressable
          onPress={() => isLong && setExpanded((v) => !v)}
          disabled={!isLong}
          style={styles.contentWrap}
        >
          <FormattedText text={visibleContent} style={styles.content} />
          {isLong ? (
            <Text style={styles.more}>{expanded ? "Show less" : "Read more"}</Text>
          ) : null}
        </Pressable>
      ) : null}

      {mediaList.length > 0 ? (
        <View style={styles.mediaWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e: any) => {
              const w = e.nativeEvent.layoutMeasurement.width || mediaWidth || 1;
              setMediaIndex(Math.round(e.nativeEvent.contentOffset.x / w));
            }}
          >
            {mediaList.map((m, i) => (
              <MediaSlide
                key={m.uri + String(i)}
                uri={m.uri}
                type={m.type}
                width={mediaWidth}
                active={i === mediaIndex}
              />
            ))}
          </ScrollView>
          {mediaList.length > 1 ? (
            <View style={styles.dots}>
              {mediaList.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === mediaIndex && styles.dotOn]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : post.image_gradient ? (
        <View style={styles.mediaPlaceholder}>
          <Ionicons name="color-palette-outline" size={30} color={Colors.textMuted} />
        </View>
      ) : null}

      {post.sound ? (
        <View style={styles.soundRow}>
          <Ionicons name="musical-notes" size={14} color={Colors.textSecondary} />
          <Text style={styles.sound} numberOfLines={1}>
            {post.sound}
          </Text>
        </View>
      ) : null}

      {/* Actions — web layout: left like+comment, right repost/share/bookmark */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.9 }] }]}
            onPress={toggleLike}
            hitSlop={6}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? Colors.danger : Colors.textSecondary}
            />
            <Text style={[styles.actionCount, liked && styles.likedText]}>
              {formatCount(likes)}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.action, pressed && { transform: [{ scale: 0.9 }] }]}
            onPress={() => setCommentsVisible(true)}
            hitSlop={6}
          >
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionCount}>{formatCount(post.comments_count ?? 0)}</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRight}>
          <Pressable
            onPress={() => setReposted((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <Ionicons
              name="repeat"
              size={24}
              color={reposted ? Colors.accent : Colors.textMuted}
            />
          </Pressable>
          <Pressable
            onPress={onShare}
            hitSlop={8}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <Ionicons name="share-outline" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setBookmarked((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={24}
              color={bookmarked ? Colors.accent : Colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      {/* Soft divider curve substitute */}
      <View style={styles.divider} />

      {/* More menu */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <View style={styles.handle} />
            <Text style={styles.menuTitle}>Post options</Text>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); onShare(); }}>
              <Ionicons name="share-outline" size={20} color={Colors.text} />
              <Text style={styles.menuText}>Share</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); setBookmarked(true); }}>
              <Ionicons name="bookmark-outline" size={20} color={Colors.text} />
              <Text style={styles.menuText}>Save</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Ionicons name="flag-outline" size={20} color={Colors.danger} />
              <Text style={[styles.menuText, { color: Colors.danger }]}>Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Comments sheet (basic — full drawer later) */}
      <Modal visible={commentsVisible} transparent animationType="slide" onRequestClose={() => setCommentsVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setCommentsVisible(false)}>
          <Pressable style={styles.commentsSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Pressable onPress={() => setCommentsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <View style={styles.commentsEmpty}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptyText}>Be the first to reply.</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    paddingBottom: Spacing.md,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  identity: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: 12 },
  identityText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: Colors.text, fontSize: 14, fontWeight: FontWeight.bold },
  meta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  typePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: Spacing.xl,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceElevated,
  },
  typeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold },
  contentWrap: { paddingHorizontal: Spacing.xl, paddingTop: 4 },
  content: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  mention: { color: "#34d399", fontWeight: FontWeight.semibold },
  more: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  mediaWrap: {
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotOn: {
    backgroundColor: "#fff",
  },
  videoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.xl,
    alignSelf: "center",
    maxWidth: "100%",
    backgroundColor: Colors.surfaceElevated,
  },
  mediaPlaceholder: {
    height: 200,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  sound: { flex: 1, color: Colors.textSecondary, fontSize: 12 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  actionsLeft: { flexDirection: "row", alignItems: "center", gap: 20 },
  actionsRight: { flexDirection: "row", alignItems: "center", gap: 20 },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },
  likedText: { color: Colors.danger },
  divider: {
    height: 1,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.xl,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    opacity: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "flex-end",
  },
  menu: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  menuTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
  },
  menuText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  commentsSheet: {
    minHeight: "50%",
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.md,
  },
  sheetTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  commentsEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
    paddingTop: 40,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    marginTop: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: "center",
    marginTop: 5,
  },
});
