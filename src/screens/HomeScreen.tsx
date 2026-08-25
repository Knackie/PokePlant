import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FilterChip } from '../components/FilterChip';
import { PlantCard } from '../components/PlantCard';
import { SearchBar } from '../components/SearchBar';
import { useFavorites } from '../context/FavoritesContext';
import { plants } from '../data/plants';
import { RootStackParamList } from '../navigation/types';
import { filterPlants } from '../utils/filterPlants';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('Toutes');
  const { toggleFavorite, isFavorite } = useFavorites();

  const families = useMemo(() => ['Toutes', ...new Set(plants.map((plant) => plant.family))], []);
  const filteredPlants = useMemo(() => filterPlants(plants, query, family), [family, query]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.badge}>PokePlant</Text>
        <Text style={styles.title}>Collectionne des plantes comme un vrai dresseur.</Text>
        <Text style={styles.subtitle}>Explore les espèces, ouvre leurs fiches et garde tes favorites.</Text>
      </View>

      <SearchBar value={query} onChangeText={setQuery} onClear={() => setQuery('')} />

      <FlatList
        data={families}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => <FilterChip label={item} selected={item === family} onPress={() => setFamily(item)} />}
      />

      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>{filteredPlants.length} plantes</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => navigation.navigate('Favorites')}><Text style={styles.toolbarAction}>Favoris</Text></Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')}><Text style={styles.toolbarAction}>Réglages</Text></Pressable>
        </View>
      </View>

      <FlatList
        data={filteredPlants}
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
        ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>Aucune plante trouvée</Text><Text style={styles.emptyText}>Essaie un autre mot-clé ou supprime le filtre.</Text></View>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  hero: { marginBottom: spacing.lg },
  badge: { color: colors.primary, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.xs },
  title: { fontSize: typography.title, fontWeight: '900', color: colors.text, lineHeight: 34 },
  subtitle: { marginTop: spacing.sm, color: colors.muted, fontSize: typography.body, lineHeight: 22 },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionTitle: { fontSize: typography.subheadline, fontWeight: '800', color: colors.text },
  toolbarAction: { color: colors.primary, fontWeight: '700' },
  list: { paddingBottom: spacing.xl },
  emptyState: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: typography.subheadline, fontWeight: '800', color: colors.text },
  emptyText: { marginTop: spacing.xs, color: colors.muted, textAlign: 'center' },
});
