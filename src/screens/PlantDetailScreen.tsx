import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFavorites } from '../context/FavoritesContext';
import { plants } from '../data/plants';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'PlantDetail'>;

export function PlantDetailScreen({ route }: Props) {
  const { plantId } = route.params;
  const plant = useMemo(() => plants.find((item) => item.id === plantId), [plantId]);
  const { toggleFavorite, isFavorite } = useFavorites();

  if (!plant) {
    return <View style={styles.centered}><Text style={styles.title}>Plante introuvable</Text></View>;
  }

  const favorite = isFavorite(plant.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.hero, { backgroundColor: plant.color }]}>
        <Text style={styles.emoji}>{plant.emoji}</Text>
        <Text style={styles.heroTitle}>{plant.name}</Text>
        <Text style={styles.heroSubtitle}>{plant.latinName}</Text>
      </View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.body}>{plant.description}</Text></View>
      <View style={styles.grid}>
        <InfoBox label="Famille" value={plant.family} />
        <InfoBox label="Habitat" value={plant.habitat} />
        <InfoBox label="Saison" value={plant.season} />
        <InfoBox label="Rareté" value={plant.rarity} />
        <InfoBox label="Difficulté" value={plant.difficulty} />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tags}>{plant.tags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}</View>
      </View>
      <Pressable onPress={() => toggleFavorite(plant)} style={[styles.actionButton, favorite ? styles.actionButtonActive : null]}>
        <Text style={styles.actionText}>{favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoBox}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, backgroundColor: colors.background, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: typography.headline, fontWeight: '900', color: colors.text },
  hero: { borderRadius: 28, padding: spacing.xl, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  heroTitle: { fontSize: typography.title, fontWeight: '900', color: '#FFFFFF' },
  heroSubtitle: { marginTop: spacing.xs, color: '#FFFFFF', opacity: 0.9, fontStyle: 'italic' },
  card: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  sectionTitle: { fontSize: typography.subheadline, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  body: { color: colors.text, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoBox: { width: '48%', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  infoLabel: { color: colors.muted, fontSize: typography.caption, marginBottom: spacing.xs },
  infoValue: { color: colors.text, fontWeight: '800' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: colors.surfaceSoft, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tagText: { color: colors.primaryDark, fontWeight: '700' },
  actionButton: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: 18, paddingVertical: spacing.md, alignItems: 'center' },
  actionButtonActive: { backgroundColor: colors.danger },
  actionText: { color: '#FFFFFF', fontWeight: '800' },
});
