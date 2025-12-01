import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

/**
 * Cabecera reutilizable para pantallas con título grande, subtítulo opcional
 * y botón de "Volver" que integra con React Navigation.
 */
const PageHeader = ({
  title,
  subtitle,
  showBackButton = true,
  backLabel = 'Volver',
  onBackPress,
  rightContent,
  style,
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const canGoBack = typeof navigation?.canGoBack === 'function' && navigation.canGoBack();
  const shouldRenderBack = showBackButton && (canGoBack || typeof onBackPress === 'function');
  const showTopRow = shouldRenderBack || Boolean(rightContent);

  const handleBack = () => {
    if (typeof onBackPress === 'function') {
      onBackPress();
      return;
    }
    if (canGoBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {showTopRow ? (
        <View style={styles.topRow}>
          <View style={styles.leftSlot}>
            {shouldRenderBack ? (
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    borderColor: colors.muted,
                    backgroundColor: colors.surface,
                    shadowColor: colors.outline,
                  },
                ]}
                onPress={handleBack}
                activeOpacity={0.9}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
                <Text style={[styles.backLabel, { color: colors.text }]}>{backLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.rightSlot}>{rightContent}</View>
        </View>
      ) : null}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.subText }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  leftSlot: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default PageHeader;
