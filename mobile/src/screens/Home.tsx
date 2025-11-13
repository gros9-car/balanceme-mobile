import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import Grid from '../components/Grid';
import Screen from '../components/Screen';
import { theme } from '../theme';
import { shadow, spacing } from '../theme/responsive';

export default function Home() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[theme.text.h1, styles.headerTitle]}>BalanceMe</Text>
        <Text style={[theme.text.p, styles.headerSubtitle]}>
          Tu espacio de hábitos y ánimo
        </Text>
      </View>

      <Grid>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={[styles.card, shadow(2)]}>
            <Text style={[theme.text.h3, styles.cardTitle]}>Card {index + 1}</Text>
            <Text style={styles.cardBody}>Contenido</Text>
          </View>
        ))}
      </Grid>

      <Button title="Añadir hábito" onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    color: theme.color.text,
  },
  headerSubtitle: {
    color: theme.color.mut,
  },
  card: {
    borderRadius: theme.radius.lg,
    padding: spacing.lg,
    backgroundColor: theme.color.card,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: theme.color.text,
  },
  cardBody: {
    color: theme.color.mut,
    marginTop: spacing.sm,
  },
});
