import type { Capture } from './types';

export const XP_PER_SPECIES = 100;
export const XP_PER_LEVEL = 300;

export function speciesKey(name: string): string {
  return name.trim().toLowerCase();
}

export function progression(captures: Capture[]) {
  const species = new Set(captures.map((plant) => speciesKey(plant.scientific_name))).size;
  const families = new Set(captures.map((plant) => plant.family.trim().toLowerCase()).filter(Boolean)).size;
  const xp = species * XP_PER_SPECIES;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { species, families, xp, level, levelXp: xp % XP_PER_LEVEL, remaining: XP_PER_LEVEL - (xp % XP_PER_LEVEL) };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  current: number;
  target: number;
  icon: 'sprout' | 'leaf' | 'compass' | 'flower' | 'tree' | 'award';
}

export function badges(captures: Capture[]): Badge[] {
  const { species, families } = progression(captures);
  return [
    { id: 'first', name: 'Première pousse', description: 'Capturer ta première espèce', current: species, target: 1, icon: 'sprout' },
    { id: 'five', name: 'La main verte', description: 'Découvrir 5 espèces différentes', current: species, target: 5, icon: 'leaf' },
    { id: 'families', name: 'Esprit curieux', description: 'Rencontrer 3 familles botaniques', current: families, target: 3, icon: 'compass' },
    { id: 'ten', name: 'Botaniste en herbe', description: 'Collectionner 10 espèces', current: species, target: 10, icon: 'flower' },
    { id: 'twentyfive', name: 'Gardien de la forêt', description: 'Collectionner 25 espèces', current: species, target: 25, icon: 'tree' },
    { id: 'fifty', name: 'Grande expédition', description: 'Collectionner 50 espèces', current: species, target: 50, icon: 'award' },
  ];
}

export function searchMatches(values: string[], query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalize(values.join(' ')).includes(normalize(query.trim()));
}
