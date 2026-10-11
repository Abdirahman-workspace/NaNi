import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/constants/theme";
import ProfileView from "../../src/components/profile/ProfileView";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["top"]}>
      <ProfileView username={username} />
    </SafeAreaView>
  );
}