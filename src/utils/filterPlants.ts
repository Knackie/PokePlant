import { Plant } from '../types/plant';

export function filterPlants(plants: Plant[], query: string, family: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return plants.filter((plant) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [plant.name, plant.latinName, plant.family, plant.habitat, ...plant.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesFamily = family === 'Toutes' || plant.family === family;

    return matchesQuery && matchesFamily;
  });
}
