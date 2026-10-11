import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize, Spacing } from "../src/constants/theme";

export default function EditProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <Text style={styles.subtitle}>Update your display name, bio, and photo.</Text>
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
