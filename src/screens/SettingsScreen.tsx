import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Réglages</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Projet</Text>
        <Text style={styles.value}>PokePlant</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Stack gratuite</Text>
        <Text style={styles.value}>Expo + React Native + données locales</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Astuce</Text>
        <Text style={styles.value}>Tu peux ajouter plus tard une base de données gratuite comme Supabase.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    color: colors.muted,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: colors.text,
    fontWeight: '700',
    lineHeight: 22,
  },
});
