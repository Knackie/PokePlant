import type { Capture } from './types';

export const XP_PER_SPECIES = 100;
export const XP_PER_LEVEL = 300;
export const XP_PER_RARITY = {
  common: 100,
  uncommon: 150,
  rare: 250,
  epic: 500,
  unclassified: XP_PER_SPECIES,
} as const;

export function xpForRarity(rarity: keyof typeof XP_PER_RARITY | null | undefined): number {
  return XP_PER_RARITY[rarity ?? 'common'];
}

export function speciesKey(name: string): string {
  return name.trim().toLowerCase();
}

export function progression(captures: Capture[]) {
  const speciesByKey = new Map<string, Capture>();
  for (const plant of captures) {
    const key = speciesKey(plant.scientific_name);
    if (!speciesByKey.has(key)) speciesByKey.set(key, plant);
  }
  const species = speciesByKey.size;
  const families = new Set(captures.map((plant) => plant.family.trim().toLowerCase()).filter(Boolean)).size;
  const xp = [...speciesByKey.values()].reduce((total, plant) => total + xpForRarity(plant.rarity), 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { species, families, xp, level, levelXp: xp % XP_PER_LEVEL, remaining: XP_PER_LEVEL - (xp % XP_PER_LEVEL) };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  current: number;
  target: number;
  icon: 'sprout' | 'leaf' | 'compass' | 'flower' | 'tree' | 'award' | 'star' | 'trophy' | 'crown' | 'gem';
}

export function badges(captures: Capture[]): Badge[] {
  const { species, families } = progression(captures);
  return [
    { id: 'first', name: 'Première pousse', description: 'Capturer ta première espèce', current: species, target: 1, icon: 'sprout' },
    { id: 'five', name: 'La main verte', description: 'Découvrir 5 espèces différentes', current: species, target: 5, icon: 'leaf' },
    { id: 'families', name: 'Esprit curieux', description: 'Rencontrer 3 familles botaniques', current: families, target: 3, icon: 'compass' },
    { id: 'ten', name: 'Botaniste en herbe', description: 'Collectionner 10 espèces', current: species, target: 10, icon: 'flower' },
    { id: 'twentyfive', name: 'Gardien de la forêt', description: 'Collectionner 25 espèces', current: species, target: 25, icon: 'tree' },
    { id: 'three', name: 'Premiers pas', description: 'Collectionner 3 espèces', current: species, target: 3, icon: 'sprout' },
    { id: 'fifteen', name: 'Promeneur attentif', description: 'Collectionner 15 espèces', current: species, target: 15, icon: 'star' },
    { id: 'fifty', name: 'Grande expédition', description: 'Collectionner 50 espèces', current: species, target: 50, icon: 'award' },
    { id: 'seventyfive', name: 'Explorateur confirmé', description: 'Collectionner 75 espèces', current: species, target: 75, icon: 'trophy' },
    { id: 'hundred', name: 'Légende verte', description: 'Collectionner 100 espèces', current: species, target: 100, icon: 'crown' },
    { id: 'families-5', name: 'Cartographe du vivant', description: 'Rencontrer 5 familles botaniques', current: families, target: 5, icon: 'compass' },
    { id: 'families-10', name: 'Grand herboriste', description: 'Rencontrer 10 familles botaniques', current: families, target: 10, icon: 'flower' },
    { id: 'families-20', name: 'Encyclopédie vivante', description: 'Rencontrer 20 familles botaniques', current: families, target: 20, icon: 'gem' },
  ];
}

export function searchMatches(values: string[], query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalize(values.join(' ')).includes(normalize(query.trim()));
}
