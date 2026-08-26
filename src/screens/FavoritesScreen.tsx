import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PlantCard } from '../components/PlantCard';
import { useFavorites } from '../context/FavoritesContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tes plantes favorites</Text>
      <Text style={styles.subtitle}>
        {favorites.length === 0
          ? 'Ajoute des plantes depuis la liste principale.'
          : 'Retrouve ici toutes les plantes que tu as marquées.'}
      </Text>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlantCard
            plant={item}
            favorite={isFavorite(item.id)}
            onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun favori pour l’instant</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.muted,
    lineHeight: 22,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  emptyState: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.muted,
    fontWeight: '700',
  },
});
