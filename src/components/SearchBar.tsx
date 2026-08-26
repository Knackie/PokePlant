import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
};

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Rechercher une plante"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable onPress={onClear} style={styles.clearButton}>
          <Text style={styles.clearText}>Effacer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
