import { Plant } from '../types/plant';

export const plants: Plant[] = [
  {
    id: 'monstera-deliciosa',
    name: 'Monstera',
    latinName: 'Monstera deliciosa',
    family: 'Aracées',
    habitat: 'Forêt tropicale',
    season: 'Toute l’année',
    rarity: 'Commune',
    difficulty: 'Facile',
    emoji: '🌿',
    color: '#2F855A',
    description: 'Grande plante iconique aux feuilles découpées.',
    tags: ['Intérieur', 'Déco', 'Tropical'],
  },
  {
    id: 'aloe-vera',
    name: 'Aloe Vera',
    latinName: 'Aloe barbadensis miller',
    family: 'Asphodelaceae',
    habitat: 'Milieux secs',
    season: 'Printemps',
    rarity: 'Commune',
    difficulty: 'Facile',
    emoji: '🪴',
    color: '#2C7A7B',
    description: 'Succulente robuste connue pour ses feuilles gorgées de gel.',
    tags: ['Succulente', 'Résistante', 'Peu d’eau'],
  },
];
