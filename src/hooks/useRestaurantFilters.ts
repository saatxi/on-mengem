import { useState } from 'react';
import { Restaurant } from '../types';
import { isVisited, matchesQuery, RESTAURANT_SORTS, sortRestaurants, type RestaurantSort } from '../utils/restaurantFields';
import { isBoolean, isString, oneOfKeys, usePersistentState } from './usePersistentState';

export const VISITED_FILTERS = { all: 'Tots', visited: 'Visitats', not_visited: 'Per anar' } as const;
export type VisitedFilter = keyof typeof VISITED_FILTERS;

const ALL_CUISINES = 'Tots';

/**
 * Cerca, filtres i ordre de la llista de restaurants (la cerca no es recorda; la resta, sí).
 * Viu a MainApp perquè «Sorprèn-me» del detall tria d'entre els restaurants filtrats.
 */
export function useRestaurantFilters(restaurants: Restaurant[]) {
  const [query, setQuery] = useState('');
  const [visited, setVisited] = usePersistentState<VisitedFilter>('filter-visited', 'all', oneOfKeys(VISITED_FILTERS));
  const [favorite, setFavorite] = usePersistentState('filter-favorite', false, isBoolean);
  const [selectedCuisine, setCuisine] = usePersistentState('filter-cuisine', ALL_CUISINES, isString);
  const [sort, setSort] = usePersistentState<RestaurantSort>('sort', 'recent', oneOfKeys(RESTAURANT_SORTS));

  // Cuines d'aquest espai; la desada pot ser d'un altre espai i llavors no filtra
  const cuisines = Array.from(new Set(restaurants.map((r) => r.cuisine).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ca'));
  const cuisine = cuisines.includes(selectedCuisine) ? selectedCuisine : ALL_CUISINES;

  const filtered = sortRestaurants(
    restaurants.filter((r) => {
      if (!matchesQuery(query, [r.name, r.cuisine, r.address, r.notes])) return false;
      if (favorite && !r.favorite) return false;
      if (visited === 'visited' && !isVisited(r)) return false;
      if (visited === 'not_visited' && isVisited(r)) return false;
      if (cuisine !== ALL_CUISINES && r.cuisine !== cuisine) return false;
      return true;
    }),
    sort,
  );

  const hasFilters = query.trim() !== '' || favorite || visited !== 'all' || cuisine !== ALL_CUISINES;
  const clear = () => {
    setQuery('');
    setFavorite(false);
    setVisited('all');
    setCuisine(ALL_CUISINES);
  };

  return {
    query,
    setQuery,
    visited,
    setVisited,
    favorite,
    setFavorite,
    cuisines,
    cuisine,
    setCuisine,
    allCuisines: ALL_CUISINES,
    sort,
    setSort,
    filtered,
    hasFilters,
    clear,
  };
}

export type RestaurantFilters = ReturnType<typeof useRestaurantFilters>;
