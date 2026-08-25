export type PlantRarity = 'Commune' | 'Peu commune' | 'Rare' | 'Légendaire';

export type Plant = {
  id: string;
  name: string;
  latinName: string;
  family: string;
  habitat: string;
  season: string;
  rarity: PlantRarity;
  difficulty: 'Facile' | 'Moyenne' | 'Difficile';
  emoji: string;
  color: string;
  description: string;
  tags: string[];
};
