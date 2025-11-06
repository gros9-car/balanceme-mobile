import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import JournalScreen from "./src/screens/JournalScreen";
import HabitsScreen from "./src/screens/HabitsScreen";
import SupportChatScreen from "./src/screens/SupportChatScreenClean";
import HelpForumScreen from "./src/screens/HelpForumScreen";
import SocialScreen from "./src/screens/SocialScreen";
import DirectChatScreen from "./src/screens/DirectChatScreen";
import MoodTrackerScreen from "./src/screens/MoodTrackerScreen";
import MoodInsightsScreen from "./src/screens/MoodInsightsScreen";
import SelfCareLibraryScreen from "./src/screens/SelfCareLibraryScreen";
import EmergencyResourcesScreen from "./src/screens/EmergencyResourcesScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import ReportDetailScreen from "./src/screens/ReportDetailScreen";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./src/screens/firebase/config";
import { useNotificationSetup } from "./src/hooks/useNotificationSetup";
import { useFriendRequestNotifications } from "./src/hooks/useFriendRequestNotifications";
import { useMessageNotifications } from "./src/hooks/useMessageNotifications";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { GoalProvider } from "./src/context/GoalContext";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { navigationTheme } = useTheme();
  const { width } = useWindowDimensions();
  const animation = width >= 768 ? "fade" : "slide_from_right";
  const [userUid, setUserUid] = useState(auth.currentUser?.uid ?? null);
  const permissionStatus = useNotificationSetup();
  const notificationsEnabled = permissionStatus !== false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserUid(user?.uid ?? null);
    });

    return unsubscribe;
  }, []);

  useFriendRequestNotifications({ enabled: notificationsEnabled, userUid });
  useMessageNotifications({ enabled: notificationsEnabled, userUid });

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation,
        }}
      >
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        {/* Main */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Mood" component={MoodTrackerScreen} />
        <Stack.Screen name="MoodInsights" component={MoodInsightsScreen} />
        <Stack.Screen name="SelfCare" component={SelfCareLibraryScreen} />
        <Stack.Screen name="Emergency" component={EmergencyResourcesScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="Habits" component={HabitsScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} />
        <Stack.Screen name="SupportChat" component={SupportChatScreen} />
        <Stack.Screen name="HelpForum" component={HelpForumScreen} />
        <Stack.Screen name="Social" component={SocialScreen} />
        <Stack.Screen name="DirectChat" component={DirectChatScreen} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <ThemeProvider>
      <GoalProvider>
        <AppNavigator />
      </GoalProvider>
    </ThemeProvider>
  );
}
