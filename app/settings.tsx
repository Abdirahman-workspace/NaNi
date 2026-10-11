import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize, Spacing } from "../src/constants/theme";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Account and app preferences.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
