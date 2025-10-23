import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Theme
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import HabitsScreen from './src/screens/HabitsScreen';
import HelpForumScreen from './src/screens/HelpForumScreen';
import SocialScreen from './src/screens/SocialScreen';
import JournalScreen from './src/screens/JournalScreen';
import MoodTrackerScreen from './src/screens/MoodTrackerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DirectChatScreen from './src/screens/DirectChatScreen';
import SupportChatScreen from './src/screens/SupportChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { navigationTheme, colors } = useTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={colors.statusBarStyle} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        {/* Main */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Mood" component={MoodTrackerScreen} />
        <Stack.Screen name="Habits" component={HabitsScreen} />
        <Stack.Screen name="HelpForum" component={HelpForumScreen} />
        <Stack.Screen name="Social" component={SocialScreen} />
        <Stack.Screen name="Journal" component={JournalScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="DirectChat" component={DirectChatScreen} />
        <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
﻿
