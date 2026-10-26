import { useState, useCallback } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  Colors,
  Radii,
  FontWeight,
  Layout,
} from "../../src/constants/theme";

type CreateOption = {
  id: "note" | "nano" | "post";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  mode: "note" | "nano" | "post";
};

const CREATE_OPTIONS: CreateOption[] = [
  { id: "note", label: "Quick Note", icon: "document-text-outline", mode: "note" },
  { id: "nano", label: "Nano", icon: "play-circle-outline", mode: "nano" },
  { id: "post", label: "Create Post", icon: "checkmark-circle-outline", mode: "post" },
];

function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createRotation = useSharedValue(0);
  const pillOpacity = useSharedValue(1);

  const isHome =
    pathname.includes("/home") ||
    pathname.includes("/following") ||
    pathname === "/" ||
    pathname.includes("/search");
  const isProfile = pathname.includes("/profile");
const openCreateMenu = useCallback(() => {
    setShowCreateMenu(true);
    createRotation.value = withTiming(45, { duration: 200, easing: Easing.out(Easing.cubic) });
    pillOpacity.value = withTiming(0.25, { duration: 200 });
  }, []);

  const closeCreateMenu = useCallback(() => {
    setShowCreateMenu(false);
    createRotation.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    pillOpacity.value = withTiming(1, { duration: 180 });
  }, []);

  const createBtnStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${createRotation.value}deg` }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
  }));

  const onSelectCreate = useCallback(
    (option: CreateOption) => {
      closeCreateMenu();
      router.push({
        pathname: "/(tabs)/create",
        params: { mode: option.mode },
      } as any);
    },
    [closeCreateMenu, router]
  );


  const isOwnProfileTab =
    pathname.endsWith("/profile") || pathname.includes("/(tabs)/profile");

  const hideTabBar = !(
    pathname.includes("/home") ||
    pathname.includes("/following") ||
    isOwnProfileTab
  );

  if (hideTabBar) {
    return null;
  }

  return (
    <>
      <Modal
        visible={showCreateMenu}
        transparent
        animationType="fade"
        onRequestClose={closeCreateMenu}
        statusBarTranslucent
      >
        <View style={styles.menuBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeCreateMenu}>
            <Animated.View
              entering={FadeIn.duration(280)}
              exiting={FadeOut.duration(220)}
              style={StyleSheet.absoluteFill}
            >
              <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.menuDim} />
            </Animated.View>
          </Pressable>

          <View
            style={[
              styles.menuColumn,
              {
                bottom:
                  Math.max(insets.bottom, 12) + Layout.createBtnSize + 58,
              },
            ]}
            pointerEvents="box-none"
          >
            {CREATE_OPTIONS.map((option, index) => (
              <Animated.View
                key={option.id}
                entering={SlideInRight.duration(320).delay(40 + index * 50)}
                exiting={SlideOutLeft.duration(220).delay(index * 30)}
                style={styles.menuRow}
              >
                <Pressable
                  onPress={() => onSelectCreate(option)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.menuLabel}>{option.label}</Text>
                  <View style={styles.menuIconCircle}>
                    <Ionicons name={option.icon} size={26} color={Colors.text} />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.wrapper,
          { paddingBottom: Math.max(insets.bottom, 12) + 6 },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.pill, pillStyle]}>
          <TabItem
            label="Home"
            icon="home"
            active={isHome && !isProfile}
            onPress={() => router.push("/(tabs)/home")}
          />
          <TabItem
            label="Profile"
            icon="person"
            active={isProfile}
            onPress={() => router.push("/(tabs)/profile")}
          />
        </Animated.View>

        <Pressable
          onPress={() =>
            showCreateMenu ? closeCreateMenu() : openCreateMenu()
          }
          style={({ pressed }) => [
            styles.createBtn,
            showCreateMenu && styles.createBtnActive,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Animated.View style={createBtnStyle}>
            <Ionicons
              name="add"
              size={28}
              color={showCreateMenu ? Colors.textInverse : Colors.text}
            />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      {active ? <View style={styles.activeBg} /> : null}
      <View style={styles.tabContent}>
        <Ionicons
          name={active ? icon : (`${icon}-outline` as any)}
          size={24}
          color={active ? Colors.text : Colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: active ? Colors.text : Colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="following" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    zIndex: 100,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: "rgba(12, 12, 12, 0.88)",
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    elevation: 12,
  },
  tabItem: {
    width: Layout.tabItemWidth,
    height: Layout.navPillHeight,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.surfaceActive,
    borderRadius: Radii["2xl"],
  },
  tabContent: { alignItems: "center", gap: 2 },
  tabLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2,
  },
  createBtn: {
    width: Layout.createBtnSize,
    height: Layout.createBtnSize,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    zIndex: 60,
  },
  createBtnActive: { backgroundColor: "#FFFFFF" },
  menuBackdrop: { flex: 1 },
  menuDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  menuColumn: {
    position: "absolute",
    right: 24,
    alignItems: "flex-end",
    gap: 16,
  },
  menuRow: { alignItems: "flex-end" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: FontWeight.semibold,
  },
  menuIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
