import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import { db } from "../../src/lib/db";

const { width: W } = Dimensions.get("window");
const GAP = 2;
const COLS = 3;
const CELL = Math.floor((W - GAP * (COLS - 1)) / COLS);
const ACCENT = "#B6F36B";
const BG = "#0c0c0c";
const MUTED = "rgba(255,255,255,0.45)";

type Mode = "post" | "nano" | "note";
type MediaKind = "photo" | "video";
type Asset = { id: string; uri: string; mediaType: MediaKind; duration: number };

function formatDuration(seconds?: number | null) {
  if (seconds == null || isNaN(Number(seconds))) return "0:00";
  const s = Math.max(0, Math.floor(Number(seconds)));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}


function MediaPickerScreen({
  visible, onClose, onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (items: { uri: string; mediaType: MediaKind }[]) => void;
}) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "images" | "videos">("all");
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const media = (viewableItems || []).filter((v: any) => v?.item?.type === "asset");
    if (media.length > 0) setActiveId(media[0].item.item.id as string);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55, minimumViewTime: 80 }).current;

  const loadAssets = useCallback(async (f: "all" | "images" | "videos") => {
    setLoading(true);
    try {
      const mediaType =
        f === "images" ? [MediaLibrary.MediaType.photo]
        : f === "videos" ? [MediaLibrary.MediaType.video]
        : [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];
      const query: any = {
        first: 200,
        mediaType,
      };
      // SDK-safe sort (SortBy.creationTime can be undefined)
      try {
        if (MediaLibrary.SortBy && (MediaLibrary.SortBy as any).creationTime) {
          query.sortBy = [[(MediaLibrary.SortBy as any).creationTime, false]];
        }
      } catch {}
      const res = await MediaLibrary.getAssetsAsync(query);
      const mapped: Asset[] = [];
      for (const a of res.assets) {
        let uri = a.uri;
        try {
          const info = await MediaLibrary.getAssetInfoAsync(a);
          uri = (info as any).localUri || info.uri || a.uri;
        } catch {}
        mapped.push({
          id: a.id,
          uri,
          mediaType: a.mediaType === MediaLibrary.MediaType.video ? "video" : "photo",
          duration: typeof a.duration === "number" ? a.duration : 0,
        });
      }
      setAssets(mapped);
    } catch (e: any) {
      Alert.alert("Media", e?.message ?? "Could not load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      let perm = permission;
      if (!perm?.granted) perm = await requestPermission();
      if (!perm?.granted) {
        Alert.alert("Permission needed", "Allow photo library access.", [
          { text: "Cancel", style: "cancel", onPress: onClose },
          { text: "Allow", onPress: async () => {
            const p = await requestPermission();
            if (p.granted) { setSelected([]); setFilter("all"); await loadAssets("all"); }
            else onClose();
          }},
        ]);
        return;
      }
      setSelected([]);
      setFilter("all");
      setActiveId(null);
      await loadAssets("all");
    })();
  }, [visible]);

  const changeFilter = async (f: "all" | "images" | "videos") => {
    if (f === filter) return;
    setFilter(f);
    setSelected([]);
    setActiveId(null);
    await loadAssets(f);
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openCamera = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) { Alert.alert("Permission", "Camera access needed."); return; }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      onDone([{ uri: res.assets[0].uri, mediaType: "photo" }]);
      onClose();
    }
  };

  const selectedAssets = selected.map((id) => assets.find((a) => a.id === id)).filter(Boolean) as Asset[];
  const photoCount = selectedAssets.filter((a) => a.mediaType === "photo").length;
  const videoCount = selectedAssets.filter((a) => a.mediaType === "video").length;
  const data: ({ type: "camera" } | { type: "asset"; item: Asset })[] = [
    { type: "camera" },
    ...assets.map((item) => ({ type: "asset" as const, item })),
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={g.root}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={g.header}>
            <Pressable onPress={onClose} style={g.circle} hitSlop={8}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <View style={g.seg}>
              {(["all", "images", "videos"] as const).map((f) => {
                const on = filter === f;
                const label = f === "all" ? "All" : f === "images" ? "Images" : "Videos";
                return (
                  <Pressable key={f} onPress={() => changeFilter(f)} style={[g.segItem, on && g.segItemOn]}>
                    <Text style={[g.segTxt, on && g.segTxtOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {loading && assets.length === 0 ? (
            <View style={g.center}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={g.loadingTxt}>Loading media…</Text>
            </View>
          ) : (
            <FlatList
              key={"grid-" + filter}
              data={data}
              numColumns={COLS}
              keyExtractor={(item) => (item.type === "camera" ? "camera" : item.item.id)}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
              removeClippedSubviews
              ListEmptyComponent={<Text style={g.empty}>No media found</Text>}
              renderItem={({ item }) => {
                if (item.type === "camera") {
                  return (
                    <Pressable style={g.cameraCell} onPress={openCamera}>
                      <Ionicons name="camera-outline" size={30} color="#fff" />
                      <Text style={g.cameraTxt}>Camera</Text>
                    </Pressable>
                  );
                }
                const a = item.item;
                const idx = selected.indexOf(a.id);
                const isOn = idx >= 0;
                const isVideo = a.mediaType === "video";
                const isActive = activeId === a.id;
                return (
                  <Pressable onPress={() => toggle(a.id)} style={[g.cell, isOn && g.cellOn]}>
                    <Image source={{ uri: a.uri }} style={g.cellImg} resizeMode="cover" />
                    {isVideo && isActive ? (
                      <View style={g.activePlay}>
                        <Ionicons name="play" size={18} color="#fff" />
                      </View>
                    ) : null}
                    {isVideo ? (
                      <View style={g.videoMeta}>
                        <Ionicons name={isActive ? "volume-mute" : "videocam"} size={13} color="#fff" />
                        <Text style={g.videoDur}>{formatDuration(a.duration)}</Text>
                      </View>
                    ) : null}
                    <View style={[g.check, isOn && g.checkOn]}>
                      {isOn ? <Text style={g.checkNum}>{idx + 1}</Text> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={g.footer}>
            <View style={{ flex: 1 }}>
              <Text style={g.countTxt}>{selected.length} selected</Text>
              {selected.length > 0 ? (
                <Text style={g.subCount}>
                  {photoCount > 0 ? photoCount + " photo" + (photoCount > 1 ? "s" : "") : ""}
                  {photoCount > 0 && videoCount > 0 ? " · " : ""}
                  {videoCount > 0 ? videoCount + " video" + (videoCount > 1 ? "s" : "") : ""}
                </Text>
              ) : (
                <Text style={g.subCount}>Scroll — videos auto-preview</Text>
              )}
            </View>
            <Pressable
              style={[g.addBtn, selected.length === 0 && { opacity: 0.4 }]}
              disabled={selected.length === 0}
              onPress={() => {
                const items = selected
                  .map((id) => assets.find((a) => a.id === id))
                  .filter(Boolean)
                  .map((a) => ({ uri: (a as Asset).uri, mediaType: (a as Asset).mediaType }));
                onDone(items);
                onClose();
              }}
            >
              <Text style={g.addBtnTxt}>Add</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}


export default function CreateScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode =
    params.mode === "nano" || params.mode === "note" || params.mode === "post" ? params.mode : "post";
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{ uri: string; mediaType: MediaKind }[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    (async () => { try { setProfile(await db.auth.getCurrentUserProfile()); } catch {} })();
  }, []);

  const openCamera = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) { Alert.alert("Permission", "Camera access needed."); return; }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setMedia((m) => [...m, { uri: res.assets[0].uri, mediaType: "photo" }]);
    }
  };

  const publish = async () => {
    if (!content.trim() && media.length === 0) {
      Alert.alert("Add something", "Write a caption or add media.");
      return;
    }
    setBusy(true);
    try {
      const u = await db.auth.getUser();
      if (!u) throw new Error("Please sign in first.");
      const uris = media.map((m) => m.uri);
      if (mode === "nano") {
        await db.nanos.create({
          user_id: u.id, caption: content.trim() || " ",
          gradient: "linear-gradient(180deg,#1f122e,#0d0614)",
        } as any);
      } else {
        await db.posts.create({
          user_id: u.id,
          content: content.trim() || " ",
          is_quote: mode === "note",
          type: mode === "note" ? "note" : "post",
          captured_image: uris[0] || undefined,
          media_urls: uris,
          media_items: media,
          media_count: media.length,
          sound: sound || undefined,
        } as any);
      }
      Alert.alert("Posted", "Your post is live.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/home") },
      ]);
    } catch (e: any) {
      Alert.alert("Could not post", e?.message ?? "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const displayName = profile?.display_name || profile?.username || "You";
  const username = profile?.username || "user";
  const initials = displayName.slice(0, 1).toUpperCase();
  const title = mode === "nano" ? "Nano" : mode === "note" ? "Quick Note" : "Create Post";
  const actionLabel = mode === "note" ? "Share" : "Post";
  const insert = (s: string) => setContent((c) => c + s);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={publish} disabled={busy} style={[styles.postBtn, busy && { opacity: 0.6 }]}>
          <Text style={styles.postBtnTxt}>{busy ? "…" : actionLabel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.author}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPh}><Text style={styles.avatarInit}>{initials}</Text></View>
          )}
          <View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.handle}>@{username}</Text>
          </View>
        </View>

        <View style={styles.captionLabelRow}>
          <Ionicons name="pencil-outline" size={14} color={MUTED} />
          <Text style={styles.captionLabel}>Write a caption</Text>
        </View>
        <TextInput
          style={styles.captionInput}
          placeholder="Small scenes, loud feelings..."
          placeholderTextColor="rgba(255,255,255,0.28)"
          multiline value={content} onChangeText={setContent} textAlignVertical="top"
        />

        {mode !== "note" && (
          <View style={styles.photoBox}>
            {media.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {media.map((m, i) => (
                  <View key={m.uri + i} style={styles.thumbWrap}>
                    <Image source={{ uri: m.uri }} style={styles.thumb} />
                    {m.mediaType === "video" ? (
                      <View style={styles.thumbVideo}><Ionicons name="videocam" size={12} color="#fff" /></View>
                    ) : null}
                    <Pressable style={styles.removePhoto} onPress={() => setMedia((list) => list.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                <Pressable style={styles.addMore} onPress={() => setPickerOpen(true)}>
                  <Ionicons name="add" size={28} color="#fff" />
                </Pressable>
              </ScrollView>
            ) : (
              <>
                <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.35)" />
                <Text style={styles.addPhotoTitle}>Add photos & videos</Text>
                <View style={styles.photoActions}>
                  <Pressable style={styles.photoBtn} onPress={openCamera}><Text style={styles.photoBtnTxt}>Camera</Text></Pressable>
                  <Pressable style={styles.photoBtn} onPress={() => setPickerOpen(true)}><Text style={styles.photoBtnTxt}>Gallery</Text></Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {mode !== "note" && (
          <Pressable style={styles.soundRow} onPress={() => setSound((s) => (s ? null : "Original sound"))}>
            <Ionicons name="musical-notes-outline" size={18} color="#fff" />
            <Text style={styles.soundTxt}>{sound ? sound : "Add sound"}</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footerBar}>
        <View style={styles.tools}>
          <Pressable style={styles.tool} onPress={() => insert("#")}><Text style={styles.toolHash}>#</Text></Pressable>
          <Pressable style={styles.tool} onPress={() => insert("@")}><Ionicons name="at" size={20} color="rgba(255,255,255,0.75)" /></Pressable>
          <Pressable style={styles.tool}><Ionicons name="globe-outline" size={20} color="rgba(255,255,255,0.75)" /></Pressable>
          <Pressable style={styles.tool}><Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.75)" /></Pressable>
          <Pressable style={styles.tool}><Ionicons name="happy-outline" size={20} color="rgba(255,255,255,0.75)" /></Pressable>
        </View>
        <View style={styles.divider} />
        <Pressable style={styles.moreRow}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          <Text style={styles.moreTxt}>More options</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </Pressable>
      </View>

      <MediaPickerScreen
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onDone={(items) => setMedia((prev) => [...prev, ...items])}
      />
    </SafeAreaView>
  );
}

const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, padding: 3 },
  segItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  segItemOn: { backgroundColor: "#fff" },
  segTxt: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 13 },
  segTxtOn: { color: "#0a0a0a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { color: MUTED, fontSize: 14 },
  cameraCell: { width: CELL, height: CELL, backgroundColor: "#141414", alignItems: "center", justifyContent: "center", marginRight: GAP, marginBottom: GAP },
  cameraTxt: { color: "#fff", fontSize: 13, marginTop: 8, fontWeight: "500" },
  cell: { width: CELL, height: CELL, marginRight: GAP, marginBottom: GAP, overflow: "hidden", backgroundColor: "#1a1a1a" },
  cellOn: { borderWidth: 3, borderColor: ACCENT },
  cellImg: { width: "100%", height: "100%" },
  videoMeta: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  videoDur: { color: "#fff", fontSize: 11, fontWeight: "700" },
  activePlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  check: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkNum: { color: "#0a0a0a", fontWeight: "800", fontSize: 12 },
  footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)", gap: 12 },
  countTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
  subCount: { color: MUTED, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: ACCENT, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999 },
  addBtnTxt: { color: "#0a0a0a", fontWeight: "800", fontSize: 16 },
  empty: { color: MUTED, textAlign: "center", marginTop: 48, width: W },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#121212" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", color: "#fff", fontSize: 17, fontWeight: "700" },
  postBtn: { backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, minWidth: 72, alignItems: "center" },
  postBtnTxt: { color: "#0a0a0a", fontWeight: "800", fontSize: 15 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  author: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, marginBottom: 20 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarPh: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#2a2a2a", alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontWeight: "700", fontSize: 16 },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  handle: { color: MUTED, fontSize: 13, marginTop: 1 },
  captionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  captionLabel: { color: MUTED, fontSize: 13 },
  captionInput: { color: "#fff", fontSize: 20, lineHeight: 28, fontWeight: "500", minHeight: 88, marginBottom: 20 },
  photoBox: { borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderStyle: "dashed", borderRadius: 18, minHeight: 180, alignItems: "center", justifyContent: "center", paddingVertical: 20, paddingHorizontal: 12, marginBottom: 14 },
  addPhotoTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 16 },
  photoActions: { flexDirection: "row", gap: 12 },
  photoBtn: { backgroundColor: "#2a2a2a", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  photoBtnTxt: { color: "#fff", fontWeight: "600", fontSize: 14 },
  thumbWrap: { marginRight: 10, position: "relative" },
  thumb: { width: 120, height: 120, borderRadius: 14 },
  thumbVideo: { position: "absolute", left: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, padding: 4 },
  removePhoto: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  addMore: { width: 120, height: 120, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  soundRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1A1A1A", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
  soundTxt: { color: "#fff", fontSize: 15, fontWeight: "500" },
  footerBar: { paddingBottom: 8 },
  tools: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  tool: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  toolHash: { color: "rgba(255,255,255,0.75)", fontSize: 20, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 20 },
  moreRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  moreTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
