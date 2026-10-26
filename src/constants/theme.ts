export const Colors = {
  background: "#171717",
  backgroundElevated: "#0c0c0c",
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceElevated: "#1a1a1a",
  surfaceActive: "#242424",
  surfaceHover: "#2a2a2a",
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.5)",
  textMuted: "rgba(255, 255, 255, 0.4)",
  textFaint: "rgba(255, 255, 255, 0.3)",
  textInverse: "#0a0c0a",
  accent: "#a3e635",
  accentBright: "#bdf626",
  accentForeground: "#1a1a1a",
  primary: "#a3e635",
  primaryForeground: "#0a0c0a",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.2)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",
  borderHairline: "rgba(255, 255, 255, 0.08)",
  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.15)",
  success: "#22c55e",
  warning: "#f59e0b",
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayHeavy: "rgba(0, 0, 0, 0.8)",
  overlayBlur: "rgba(0, 0, 0, 0.6)",
  card: "rgba(255, 255, 255, 0.05)",
  welcomeTop: "hsl(130, 40%, 72%)",
  welcomeMid: "hsl(140, 35%, 78%)",
  welcomeBottom: "hsl(130, 30%, 82%)",
  welcomeText: "#0a0a0a",
  welcomeTextMuted: "rgba(0, 0, 0, 0.5)",
  welcomeTextSoft: "rgba(0, 0, 0, 0.6)",
} as const;

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
  "2xl": 24, "3xl": 32, "4xl": 40, "5xl": 48, "6xl": 64,
} as const;

export const Radii = {
  sm: 8, md: 12, lg: 16, xl: 20, "2xl": 24, "3xl": 28, pill: 28, full: 9999,
} as const;

export const FontSize = {
  xs: 10, sm: 12, md: 13, base: 14, lg: 16, xl: 18, "2xl": 22, "3xl": 28, "4xl": 34,
} as const;

export const FontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
  black: "900" as const,
};

export const Motion = {
  fast: 150, normal: 250, slow: 400,
  spring: { damping: 18, stiffness: 280, mass: 0.8 },
  navSpring: { damping: 22, stiffness: 320, mass: 0.7 },
} as const;

export const Layout = {
  navPillHeight: 54, createBtnSize: 56, navBottomPad: 40, tabItemWidth: 120, contentMaxWidth: 640,
} as const;
