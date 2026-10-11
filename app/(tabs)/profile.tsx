import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../src/constants/theme";
import ProfileView from "../../src/components/profile/ProfileView";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["top"]}>
      <ProfileView />
    </SafeAreaView>
  );
}