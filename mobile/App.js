import React, { useEffect, useState } from "react";
import { useWindowDimensions, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
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
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import TermsAndConditionsScreen from "./src/screens/TermsAndConditionsScreen";
import AboutBalanceMeScreen from "./src/screens/AboutBalanceMeScreen";
import DailyGoalsScreen from "./src/screens/DailyGoalsScreen";
import DailyGoalDetailScreen from "./src/screens/DailyGoalDetailScreen";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./src/screens/firebase/config";
import { useNotificationSetup } from "./src/hooks/useNotificationSetup";
import { useFriendRequestNotifications } from "./src/hooks/useFriendRequestNotifications";
import { useMessageNotifications } from "./src/hooks/useMessageNotifications";
import { useSessionSecurity } from "./src/hooks/useSessionSecurity";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { GoalProvider } from "./src/context/GoalContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { defaultScreenOptions } from "./src/navigation/options";
import { AppAlertProvider } from "./src/context/AppAlertContext";
import { navigationRef } from "./src/navigation/navigationRef";
import { useNotificationNavigation } from "./src/hooks/useNotificationNavigation";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { navigationTheme } = useTheme();
  const { width } = useWindowDimensions();
  const animation = width >= 768 ? "fade" : "slide_from_right";
  const [user, setUser] = useState(() => auth.currentUser ?? null);
  const [initializing, setInitializing] = useState(true);
  const userUid = user?.uid ?? null;
  const permissionStatus = useNotificationSetup(userUid);
  const notificationsEnabled = permissionStatus !== false;
  const notificationHooksEnabled = Boolean(userUid);

  useNotificationNavigation();
  useSessionSecurity(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user ?? null);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  // Para lógica interna (badges, contadores, etc.) queremos que
  // los hooks corran siempre que haya usuario, aunque el sistema
  // tenga deshabilitadas las notificaciones push.
  useFriendRequestNotifications({ enabled: notificationHooksEnabled, userUid });
  useMessageNotifications({ enabled: notificationHooksEnabled, userUid });

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          ...defaultScreenOptions,
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation,
        }}
      >
        {user ? (
          <>
            {/* Main */}
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="Mood" component={MoodTrackerScreen} />
            <Stack.Screen name="MoodInsights" component={MoodInsightsScreen} />
            <Stack.Screen name="SelfCare" component={SelfCareLibraryScreen} />
            <Stack.Screen name="Emergency" component={EmergencyResourcesScreen} />
            <Stack.Screen name="Journal" component={JournalScreen} />
            <Stack.Screen name="Habits" component={HabitsScreen} />
            <Stack.Screen name="DailyGoals" component={DailyGoalsScreen} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
            <Stack.Screen name="DailyGoalDetail" component={DailyGoalDetailScreen} />
            <Stack.Screen name="SupportChat" component={SupportChatScreen} />
            <Stack.Screen name="HelpForum" component={HelpForumScreen} />
            <Stack.Screen name="Social" component={SocialScreen} />
            <Stack.Screen name="DirectChat" component={DirectChatScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
            <Stack.Screen name="AboutBalanceMe" component={AboutBalanceMeScreen} />
          </>
        ) : (
          <>
            {/* Auth */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="AboutBalanceMe" component={AboutBalanceMeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppAlertProvider>
          <GoalProvider>
            <AppNavigator />
          </GoalProvider>
        </AppAlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
