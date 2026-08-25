import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void; }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.selectedChip : null]}>
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selectedChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.text, fontWeight: '600' },
  selectedLabel: { color: '#FFFFFF' },
});
