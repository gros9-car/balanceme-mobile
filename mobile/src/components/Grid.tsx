import React, { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { breakpoints, spacing } from '../theme/responsive';

type Props = {
  children: ReactNode;
};

/**
 * Layout de cuadrícula responsiva que distribuye los hijos
 * en 2, 3 o 4 columnas según el ancho de pantalla disponible.
 */
export default function Grid({ children }: Props) {
  const { width } = useWindowDimensions();
  const cols = width >= breakpoints.desktop ? 4 : width >= breakpoints.tablet ? 3 : 2;
  const columnWidth = `${100 / cols}%`;

  return (
    <View style={[styles.grid, { gap: spacing.md }]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ flexBasis: columnWidth, maxWidth: columnWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
