import { describe, expect, it } from 'vitest';
import { rarityOrder, rarityLabels } from './rarity';
import { classifyPlantRarity } from '../../supabase/functions/_shared/plant-rarity';

describe('rareté basée sur les observations européennes GBIF', () => {
  it('explique les catégories sans confondre absence de données et rareté', () => {
    expect(rarityLabels).toEqual({
      common: 'Commune',
      uncommon: 'Insolite',
      rare: 'Rare',
      epic: 'Épique',
      unclassified: 'À classer',
    });
  });

  it('ordonne les plantes des plus rares aux plus communes puis aux données manquantes', () => {
    expect(Object.entries(rarityOrder).sort((a, b) => a[1] - b[1]).map(([rarity]) => rarity))
      .toEqual(['epic', 'rare', 'uncommon', 'common', 'unclassified']);
  });

  it('applique les seuils GBIF documentés et laisse zéro observation à classer', () => {
    expect([0, 1, 99, 100, 999, 1_000, 9_999, 10_000].map(classifyPlantRarity))
      .toEqual(['unclassified', 'epic', 'epic', 'rare', 'rare', 'uncommon', 'uncommon', 'common']);
  });
});
