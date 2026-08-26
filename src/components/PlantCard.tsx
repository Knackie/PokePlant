import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Plant } from '../types/plant';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type PlantCardProps = {
  plant: Plant;
  onPress: () => void;
  onToggleFavorite: () => void;
  favorite: boolean;
};

export function PlantCard({ plant, onPress, onToggleFavorite, favorite }: PlantCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.emojiBubble, { backgroundColor: plant.color }]}>
        <Text style={styles.emoji}>{plant.emoji}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{plant.name}</Text>
          <Pressable onPress={onToggleFavorite} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.heart, favorite ? styles.heartActive : null]}>
              {favorite ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.latin}>{plant.latinName}</Text>
        <Text style={styles.meta}>
          {plant.family} · {plant.rarity}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emojiBubble: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  latin: {
    marginTop: 2,
    color: colors.muted,
    fontStyle: 'italic',
  },
  meta: {
    marginTop: spacing.xs,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  heart: {
    fontSize: 20,
    color: colors.muted,
  },
  heartActive: {
    color: colors.danger,
  },
});
