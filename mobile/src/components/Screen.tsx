import React, { ReactNode } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { isAndroid, shadow } from '../theme/responsive';

type Props = {
  children: ReactNode;
  padded?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

export default function Screen({
  children,
  padded = true,
  scroll = false,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingStyles = padded ? { paddingHorizontal: theme.space.lg } : undefined;

  const content = (
    <View style={[styles.container, paddingStyles, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.color.bg}
        translucent={false}
        animated
      />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  container: {
    flex: 1,
    gap: 12,
    ...(isAndroid ? {} : shadow(1)),
  },
  scrollContent: {
    flexGrow: 1,
  },
});
