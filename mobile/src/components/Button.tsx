import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { theme } from '../theme';
import { platformStyles } from '../theme/platform';

type Props = {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * Botón primario reutilizable con estilos consistentes y soporte
 * para ripple en Android. Recibe un título y un manejador de presión.
 */
export default function Button({ title, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={platformStyles?.ripple}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.color.pri,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: '#FFFFFF',
    fontSize: theme.text.h3.fontSize,
    fontWeight: '600',
  },
});
