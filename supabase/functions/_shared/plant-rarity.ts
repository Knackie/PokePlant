export type PlantRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'unclassified';

export function classifyPlantRarity(count: number): PlantRarity {
  if (count === 0) return 'unclassified';
  if (count < 100) return 'epic';
  if (count < 1_000) return 'rare';
  if (count < 10_000) return 'uncommon';
  return 'common';
}
