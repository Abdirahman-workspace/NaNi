import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../lib/db";
import PostCard from "../home/PostCard";

const { width: W } = Dimensions.get("window");
const BG = "#0b0b11";
const MUT = "#85878f";
const LINE = "rgba(255,255,255,0.12)";
const HERO = 520;
const AV = 76;

type Props = { username?: string };

function formatStat(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function ProfileView({ username }: Props) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [me, setMe] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const myId = await db.auth.getCurrentUserId();
      setMe(myId);
      const target = username
        ? await db.profiles.getByUsername(username)
        : await db.auth.getCurrentUserProfile();
      if (!target) {
        setProfile(null);
        return;
      }
      setProfile(target);
      const [allPosts, fl, fg] = await Promise.all([
        db.posts.list(100),
        db.follows.listFollowers(target.id),
        db.follows.listFollowing(target.id),
      ]);
      setPosts(allPosts.filter((p: any) => p.user_id === target.id));
      setFollowers(fl.length);
      setFollowing(fg.length);
      if (myId && myId !== target.id) {
        setIsFollowing(await db.follows.isFollowing(myId, target.id));
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.value = e.contentOffset.y;
    },
  });

  const hdStyle = useAnimatedStyle(() => {
    const on = y.value > 80;
    return {
      backgroundColor: on ? "rgba(11,11,17,0.92)" : "transparent",
      borderBottomColor: on ? "#23242c" : "transparent",
    };
  });

  const ttlStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [60, 120], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(y.value, [60, 120], [6, 0], Extrapolation.CLAMP) },
    ],
  }));

  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [70, 130], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(y.value, [70, 130], [0.5, 1], Extrapolation.CLAMP) },
    ],
  }));

  const heroParallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value * 0.35 },
      { scale: 1 + Math.min(y.value, 400) / 2200 },
    ],
  }));

  const toggleFollow = async () => {
    if (!me || !profile || me === profile.id) return;
    const next = await db.follows.followToggle(me, profile.id);
    setIsFollowing(next);
    setFollowers((v) => Math.max(0, v + (next ? 1 : -1)));
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={{ color: MUT }}>Profile not found</Text>
      </View>
    );
  }

  const isMe = me === profile.id;
  const name = profile.display_name || profile.username || "User";
  const initials = name.slice(0, 2).toUpperCase();
  const bannerUri =
    profile.banner_url ||
    "https://images.unsplash.com/photo-1509233725247-49e657c54213?w=1200&q=80";

  return (
    <View style={s.root}>
      <Animated.View style={[s.hd, { paddingTop: insets.top }, hdStyle]}>
        <View style={s.bar}>
          <Pressable
            style={s.ib}
            onPress={() =>
              router.canGoBack() ? router.back() : router.push("/(tabs)/home")
            }
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Animated.View style={[s.ttl, ttlStyle]}>
            <Animated.View style={[s.mini, miniStyle]}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.miniImg} />
              ) : (
                <View style={s.miniPh}>
                  <Text style={s.miniT}>{initials[0]}</Text>
                </View>
              )}
            </Animated.View>
            <View>
              <Text style={s.ttlB} numberOfLines={1}>
                {name}
              </Text>
              <Text style={s.ttlS}>@{profile.username}</Text>
            </View>
          </Animated.View>
          <Pressable
            style={s.ib}
            onPress={() => (isMe ? router.push("/settings") : null)}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        {/* Photo + smooth gradient + identity all in ONE block */}
        <View style={[s.heroBlock, { paddingTop: insets.top }]}>
          <Animated.View style={[StyleSheet.absoluteFill, heroParallax]}>
            <Image source={{ uri: bannerUri }} style={s.heroImg} resizeMode="cover" />
          </Animated.View>

          <LinearGradient
            colors={[
              "transparent",
              "transparent",
              "rgba(11,11,17,0.2)",
              "rgba(11,11,17,0.5)",
              "rgba(11,11,17,0.78)",
              "rgba(11,11,17,0.94)",
              BG,
            ]}
            locations={[0, 0.32, 0.48, 0.6, 0.72, 0.86, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={s.identityOnHero}>
            <View style={s.avWrap}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.av} />
              ) : (
                <View style={[s.av, s.avPh]}>
                  <Text style={s.avInit}>{initials}</Text>
                </View>
              )}
            </View>

            <Animated.View entering={FadeInDown.delay(80).duration(700)} style={s.nmRow}>
              <Text style={s.nm}>{name}</Text>
              <View style={s.badge}>
                <Ionicons name="checkmark" size={11} color="#5b9bff" />
              </View>
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(120).duration(700)} style={s.hn}>
              @{profile.username}
            </Animated.Text>

            <Animated.View entering={FadeInDown.delay(160).duration(700)} style={s.actions}>
              {isMe ? (
                <Pressable
                  style={({ pressed }) => [s.edit, pressed && { transform: [{ scale: 0.96 }] }]}
                  onPress={() => router.push("/edit-profile")}
                >
                  <Ionicons name="pencil-outline" size={18} color={BG} />
                  <Text style={s.editTxt}>Edit Profile</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    s.edit,
                    isFollowing && s.editGhost,
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                  onPress={toggleFollow}
                >
                  <Text style={[s.editTxt, isFollowing && { color: "#fff" }]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [s.share, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              </Pressable>
            </Animated.View>
          </View>
        </View>

        <View style={s.below}>
          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statN}>{formatStat(following)}</Text>
              <Text style={s.statL}>Following</Text>
            </View>
            <Pressable
              style={s.stat}
              onPress={() => router.push(`/followers/${profile.username}` as any)}
            >
              <Text style={s.statN}>{formatStat(followers)}</Text>
              <Text style={s.statL}>Followers</Text>
            </Pressable>
            <View style={s.stat}>
              <Text style={s.statN}>{formatStat(posts.length)}</Text>
              <Text style={s.statL}>Creations</Text>
            </View>
          </View>

          <Text style={s.bio}>
            {profile.bio ||
              "Designer & creator. Sharing daily inspiration and minimalist aesthetics."}
          </Text>

          <Pressable
            style={s.lnk}
            onPress={() => {
              const raw = profile.link || "nationofniches.com";
              const url = raw.startsWith("http") ? raw : "https://" + raw;
              Linking.openURL(url).catch(() => {});
            }}
          >
            <Ionicons name="link-outline" size={16} color="#8a8c96" />
            <Text style={s.lnkT}>{profile.link || "nationofniches.com"}</Text>
            <Ionicons name="open-outline" size={14} color="#8a8c96" />
          </Pressable>

          <View style={s.hr} />

          {posts.length === 0 ? (
            <Text style={s.end}>No creations yet</Text>
          ) : (
            posts.map((p) => (
              <View key={p.id} style={s.cardShell}>
                <PostCard post={p} />
              </View>
            ))
          )}
          {posts.length > 0 && <Text style={s.end}>You are all caught up</Text>}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: "center", justifyContent: "center" },
  hd: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    borderBottomWidth: 1,
  },
  bar: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ib: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(22,30,42,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  ttl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: W - 130,
  },
  mini: { width: 32, height: 32, borderRadius: 16, overflow: "hidden" },
  miniImg: { width: 32, height: 32 },
  miniPh: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#26272e",
    alignItems: "center",
    justifyContent: "center",
  },
  miniT: { color: "#fff", fontWeight: "700", fontSize: 12 },
  ttlB: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ttlS: { color: "#8b8d99", fontSize: 13, fontFamily: "monospace" },
  heroBlock: {
    width: W,
    height: HERO,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroImg: {
    width: W,
    height: HERO + 80,
    position: "absolute",
    top: 0,
    left: 0,
  },
  identityOnHero: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  avWrap: {
    marginBottom: 12,
    borderRadius: AV / 2 + 3,
    borderWidth: 3,
    borderColor: BG,
    overflow: "hidden",
    backgroundColor: BG,
  },
  av: { width: AV, height: AV, borderRadius: AV / 2 },
  avPh: {
    backgroundColor: "#26272e",
    alignItems: "center",
    justifyContent: "center",
  },
  avInit: { color: "#fff", fontSize: 26, fontWeight: "700" },
  nmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  nm: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1b3469",
    borderWidth: 1.5,
    borderColor: "#3b72d9",
    alignItems: "center",
    justifyContent: "center",
  },
  hn: {
    marginTop: 4,
    color: "#8b8d99",
    fontSize: 13,
    fontFamily: "monospace",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: "100%",
  },
  edit: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  editGhost: {
    backgroundColor: "#26272e",
    borderWidth: 1,
    borderColor: "#3a3b44",
  },
  editTxt: { color: BG, fontSize: 15, fontWeight: "600" },
  share: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#26272e",
    borderWidth: 1,
    borderColor: "#3a3b44",
    alignItems: "center",
    justifyContent: "center",
  },
  below: { backgroundColor: BG, paddingTop: 8 },
  stats: { flexDirection: "row", paddingHorizontal: 24, marginTop: 8 },
  stat: { flex: 1, alignItems: "center" },
  statN: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 28 },
  statL: { color: MUT, fontSize: 13, marginTop: 6 },
  bio: {
    marginTop: 16,
    paddingHorizontal: 28,
    textAlign: "center",
    color: "#c8c9d1",
    fontSize: 13,
    lineHeight: 22.5,
  },
  lnk: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lnkT: { color: "#c7c8d0", fontSize: 13 },
  hr: {
    height: 1,
    backgroundColor: LINE,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  cardShell: { marginBottom: 6 },
  end: {
    textAlign: "center",
    color: MUT,
    fontSize: 13,
    marginTop: 28,
    marginBottom: 16,
  },
});
