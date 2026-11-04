import { describe, expect, it } from 'vitest';
import { catalog, rarityLabels } from './data';

describe('rareté ludique du Plantédex', () => {
  it('attribue une catégorie à chaque fiche de départ', () => {
    expect(catalog).toHaveLength(43);
    expect(catalog.every((plant) => plant.rarity in rarityLabels)).toBe(true);
  });

  it('propose les quatre catégories et garde les espèces épiques limitées', () => {
    const counts = Object.fromEntries(
      Object.keys(rarityLabels).map((rarity) => [rarity, catalog.filter((plant) => plant.rarity === rarity).length]),
    );
    expect(counts).toEqual({ common: 22, uncommon: 12, rare: 6, epic: 3 });
  });

  it('conserve une rareté ludique fixe pour quelques plantes repères', () => {
    expect(catalog.find((plant) => plant.scientificName === 'Monstera deliciosa')?.rarity).toBe('epic');
    expect(catalog.find((plant) => plant.scientificName === 'Taraxacum officinale')?.rarity).toBe('common');
    expect(catalog.find((plant) => plant.scientificName === 'Ginkgo biloba')?.rarity).toBe('epic');
  });
});
