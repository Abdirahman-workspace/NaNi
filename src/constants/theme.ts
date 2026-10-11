
export const Colors = {
  // Core backgrounds
  background: "#171717",
  backgroundElevated: "#0c0c0c",
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceElevated: "#1a1a1a",
  surfaceActive: "#242424",

  // Text
  text: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.5)",
  textMuted: "rgba(255, 255, 255, 0.3)",
  textInverse: "#0a0c0a",

  // Brand / Accent (lime green from web)
  accent: "#a3e635",
  accentForeground: "#1a1a1a",
  primary: "#a3e635",
  primaryForeground: "#0a0c0a",

  // Borders
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.2)",
  borderSubtle: "rgba(255, 255, 255, 0.05)",

  // Semantic
  danger: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",

  // Overlays
  overlay: "rgba(0, 0, 0, 0.6)",
  overlayHeavy: "rgba(0, 0, 0, 0.8)",

  // Card
  card: "rgba(255, 255, 255, 0.05)",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
} as const;

export const FontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  black: "900" as const,
};