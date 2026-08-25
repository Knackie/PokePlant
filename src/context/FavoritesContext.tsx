import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Plant } from '../types/plant';

type FavoritesContextValue = {
  favorites: Plant[];
  toggleFavorite: (plant: Plant) => void;
  isFavorite: (plantId: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Plant[]>([]);

  const toggleFavorite = useCallback((plant: Plant) => {
    setFavorites((current) => {
      const alreadyFavorite = current.some((item) => item.id === plant.id);
      if (alreadyFavorite) return current.filter((item) => item.id !== plant.id);
      return [plant, ...current];
    });
  }, []);

  const isFavorite = useCallback(
    (plantId: string) => favorites.some((item) => item.id === plantId),
    [favorites]
  );

  const value = useMemo(
    () => ({ favorites, toggleFavorite, isFavorite }),
    [favorites, toggleFavorite, isFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within a FavoritesProvider');
  return context;
}
