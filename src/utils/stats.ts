// Estadístiques de la pestanya «Resum» i de l'«Any en xifres». Funcions pures: `now` es pot injectar als tests.
// Les visites sense data (visitedOn buit) compten als totals, però no als càlculs per data.
import type { Restaurant, Visit, WishlistItem } from '../types';
import { PRICE_RANGES, shownRating, visitAverage } from './restaurantFields';
import { parseLocalDate } from './time';

const DAY_MS = 24 * 60 * 60 * 1000;

// Una visita és «oblidada» si fa més d'aquests mesos de la darrera i la nota hi arriba
const FORGOTTEN_MONTHS = 6;
const FORGOTTEN_MIN_RATING = 4;

export type StatsPeriod = 'year' | 'all';

/** Clau de mes «AAAA-MM» en hora local. */
export const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const datedVisits = (r: Restaurant) => r.visits.filter((v): v is Visit & { visitedOn: string } => !!v.visitedOn);

const visitYear = (v: Visit) => (v.visitedOn ? parseLocalDate(v.visitedOn).getFullYear() : null);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

const byName = (a: Restaurant, b: Restaurant) => a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });

/** Data de la darrera visita amb data, o null. */
export const latestVisitDate = (r: Restaurant): Date | null => {
  const dates = datedVisits(r).map((v) => parseLocalDate(v.visitedOn).getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
};

/** Visites de cada un dels darrers `months` mesos (el darrer és el mes en curs), també els mesos sense cap. */
export const visitsByMonth = (restaurants: Restaurant[], now = new Date(), months = 12) => {
  const counts = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) counts.set(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), 0);
  for (const v of restaurants.flatMap(datedVisits)) {
    const key = monthKey(parseLocalDate(v.visitedOn));
    const count = counts.get(key);
    if (count !== undefined) counts.set(key, count + 1);
  }
  return Array.from(counts, ([month, count]) => ({ month, count }));
};

/** Dies des de la darrera visita (0 = avui), o null si no n'hi ha cap amb data. */
export const daysSinceLastVisit = (restaurants: Restaurant[], now = new Date()): number | null => {
  const dates = restaurants.map(latestVisitDate).filter((d): d is Date => d !== null);
  if (!dates.length) return null;
  const last = Math.max(...dates.map((d) => startOfDay(d).getTime()));
  return Math.max(0, Math.round((startOfDay(now).getTime() - last) / DAY_MS));
};

/** Mesos seguits amb alguna visita, comptant enrere des del mes en curs (o des de l'anterior si aquest encara no en té). */
export const monthStreak = (restaurants: Restaurant[], now = new Date()): number => {
  const months = new Set(restaurants.flatMap(datedVisits).map((v) => monthKey(parseLocalDate(v.visitedOn))));
  let offset = months.has(monthKey(now)) ? 0 : 1;
  let streak = 0;
  while (months.has(monthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)))) {
    streak++;
    offset++;
  }
  return streak;
};

export interface RankedRestaurant {
  restaurant: Restaurant;
  value: number;
}

/** Els millor valorats, segons la nota que es mostra a les targetes. */
export const topRated = (restaurants: Restaurant[], limit = 5): RankedRestaurant[] =>
  restaurants
    .map((restaurant) => ({ restaurant, value: shownRating(restaurant) ?? 0 }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value || b.restaurant.visits.length - a.restaurant.visits.length || byName(a.restaurant, b.restaurant))
    .slice(0, limit);

/** Els que s'han repetit més (dues visites o més). */
export const mostRepeated = (restaurants: Restaurant[], limit = 5): RankedRestaurant[] =>
  restaurants
    .filter((r) => r.visits.length >= 2)
    .map((restaurant) => ({ restaurant, value: restaurant.visits.length }))
    .sort((a, b) => b.value - a.value || byName(a.restaurant, b.restaurant))
    .slice(0, limit);

/** Ben valorats que fa temps que no es visiten; `value` són els dies des de la darrera visita. Primer, els més oblidats. */
export const forgotten = (restaurants: Restaurant[], now = new Date(), limit = 5): RankedRestaurant[] => {
  const threshold = new Date(now.getFullYear(), now.getMonth() - FORGOTTEN_MONTHS, now.getDate());
  return restaurants
    .flatMap((restaurant) => {
      const last = latestVisitDate(restaurant);
      const rating = shownRating(restaurant);
      if (!last || last >= threshold || rating == null || rating < FORGOTTEN_MIN_RATING) return [];
      return [{ restaurant, value: Math.round((startOfDay(now).getTime() - startOfDay(last).getTime()) / DAY_MS) }];
    })
    .sort((a, b) => b.value - a.value || byName(a.restaurant, b.restaurant))
    .slice(0, limit);
};

export interface PriceRow {
  range: string;
  count: number;
  rating: number | null;
}

/** Restaurants i nota mitjana de cada franja de preu, en l'ordre de PRICE_RANGES. `bestValue` és la franja
 * més barata amb una nota igual o superior a la mitjana de tots els que tenen preu. */
export const priceBreakdown = (restaurants: Restaurant[]) => {
  const rows: PriceRow[] = PRICE_RANGES.map((range) => {
    const inRange = restaurants.filter((r) => r.priceRange === range);
    const ratings = inRange.map(shownRating).filter((rating): rating is number => rating != null && rating > 0);
    return { range, count: inRange.length, rating: average(ratings) };
  });
  const overall = average(
    restaurants
      .filter((r) => r.priceRange && PRICE_RANGES.includes(r.priceRange))
      .map(shownRating)
      .filter((rating): rating is number => rating != null && rating > 0),
  );
  const bestValue = overall == null ? null : (rows.find((row) => row.rating != null && row.rating >= overall)?.range ?? null);
  return { rows, bestValue };
};

export interface CuisineRow {
  cuisine: string;
  visits: number;
  favorites: number;
  total: number;
  /** Nota mitjana dels restaurants valorats d'aquesta cuina. */
  rating: number | null;
}

/** Visites, favorits, restaurants i nota mitjana per cuina; els que no en tenen van a «Altres». */
export const cuisineRows = (restaurants: Restaurant[]): CuisineRow[] => {
  const byCuisine = new Map<string, { row: CuisineRow; ratings: number[] }>();
  for (const r of restaurants) {
    const cuisine = r.cuisine?.trim() || 'Altres';
    const entry = byCuisine.get(cuisine) ?? { row: { cuisine, visits: 0, favorites: 0, total: 0, rating: null }, ratings: [] };
    entry.row.total += 1;
    entry.row.visits += r.visits.length;
    if (r.favorite) entry.row.favorites += 1;
    const rating = shownRating(r);
    if (rating != null && rating > 0) entry.ratings.push(rating);
    byCuisine.set(cuisine, entry);
  }
  return Array.from(byCuisine.values(), ({ row, ratings }) => ({ ...row, rating: average(ratings) }));
};

/** Amb 'year', només els restaurants visitats aquest any i, de cadascun, només les visites d'aquest any. */
export const filterByPeriod = (restaurants: Restaurant[], period: StatsPeriod, now = new Date()): Restaurant[] => {
  if (period === 'all') return restaurants;
  const year = now.getFullYear();
  return restaurants.flatMap((r) => {
    const visits = r.visits.filter((v) => visitYear(v) === year);
    return visits.length ? [{ ...r, visits }] : [];
  });
};

/** Anys amb alguna visita, del més recent al més antic. */
export const yearsWithVisits = (restaurants: Restaurant[]): number[] =>
  Array.from(new Set(restaurants.flatMap(datedVisits).map((v) => parseLocalDate(v.visitedOn).getFullYear()))).sort((a, b) => b - a);

export interface YearSummary {
  year: number;
  visits: number;
  restaurants: number;
  /** Restaurants visitats per primer cop aquest any. */
  newRestaurants: number;
  topCuisine: { cuisine: string; visits: number } | null;
  mostRepeated: { name: string; visits: number } | null;
  bestRated: { name: string; rating: number } | null;
  /** Mes (0-11) amb més visites. */
  busiestMonth: { month: number; visits: number } | null;
  wishesFulfilled: number;
}

const yearOf = (dateStr: string | undefined) => (dateStr ? parseLocalDate(dateStr).getFullYear() : null);

/**
 * Desitjats convertits en restaurant aquell any. Els restaurants en guarden la data; els desitjats «Provats» que
 * queden d'abans de la migració 0002 (sense restaurant associat) compten per la data de l'última edició.
 */
const wishesFulfilledIn = (restaurants: Restaurant[], wishlist: WishlistItem[], year: number) =>
  restaurants.filter((r) => yearOf(r.wishFulfilledAt) === year).length +
  wishlist.filter((w) => w.status === 'visited' && yearOf(w.updatedAt) === year).length;

/** Resum d'un any a partir de les visites amb data d'aquell any. */
export const yearSummary = (restaurants: Restaurant[], wishlist: WishlistItem[], year: number): YearSummary => {
  const visited = restaurants.flatMap((r) => {
    const visits = r.visits.filter((v) => visitYear(v) === year);
    return visits.length ? [{ restaurant: r, visits }] : [];
  });

  const newRestaurants = visited.filter(({ restaurant }) =>
    datedVisits(restaurant).every((v) => parseLocalDate(v.visitedOn).getFullYear() >= year),
  ).length;

  const cuisineVisits = new Map<string, number>();
  const monthVisits = new Map<number, number>();
  for (const { restaurant, visits } of visited) {
    const cuisine = restaurant.cuisine?.trim() || 'Altres';
    cuisineVisits.set(cuisine, (cuisineVisits.get(cuisine) ?? 0) + visits.length);
    for (const v of visits) {
      const month = parseLocalDate(v.visitedOn!).getMonth();
      monthVisits.set(month, (monthVisits.get(month) ?? 0) + 1);
    }
  }

  // El primer amb el valor més alt; en cas d'empat, el que va primer en l'ordre donat
  const maxEntry = <K>(entries: Iterable<[K, number]>) => {
    let best: [K, number] | null = null;
    for (const entry of entries) if (!best || entry[1] > best[1]) best = entry;
    return best;
  };

  const sortedCuisines = Array.from(cuisineVisits).sort((a, b) => a[0].localeCompare(b[0], 'ca'));
  const topCuisine = maxEntry(sortedCuisines);
  const busiestMonth = maxEntry(Array.from(monthVisits).sort((a, b) => a[0] - b[0]));
  const repeated = maxEntry(visited.map(({ restaurant, visits }) => [restaurant.name, visits.length] as [string, number]));
  const best = maxEntry(
    visited.flatMap(({ restaurant, visits }) => {
      const rating = visitAverage({ ...restaurant, visits });
      return rating == null ? [] : [[restaurant.name, rating] as [string, number]];
    }),
  );

  return {
    year,
    visits: visited.reduce((sum, { visits }) => sum + visits.length, 0),
    restaurants: visited.length,
    newRestaurants,
    topCuisine: topCuisine && { cuisine: topCuisine[0], visits: topCuisine[1] },
    mostRepeated: repeated && repeated[1] >= 2 ? { name: repeated[0], visits: repeated[1] } : null,
    bestRated: best && { name: best[0], rating: best[1] },
    busiestMonth: busiestMonth && { month: busiestMonth[0], visits: busiestMonth[1] },
    wishesFulfilled: wishesFulfilledIn(restaurants, wishlist, year),
  };
};

/** «1 visita», «3 visites». */
export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Nom del mes en català («gener», «octubre»…). */
export const monthName = (month: number) => new Date(2000, month, 1).toLocaleDateString('ca', { month: 'long' });

/** Resum en text per compartir l'«Any en xifres». */
export const yearSummaryText = (summary: YearSummary, spaceName?: string): string => {
  const lines = [`El ${summary.year} ${spaceName ? `de «${spaceName}» ` : ''}en xifres 🍽️`];
  lines.push(
    `${plural(summary.visits, 'visita', 'visites')} a ${plural(summary.restaurants, 'restaurant', 'restaurants')} (${summary.newRestaurants} de nous)`,
  );
  if (summary.topCuisine) lines.push(`Cuina preferida: ${summary.topCuisine.cuisine}`);
  if (summary.mostRepeated) lines.push(`Més repetit: ${summary.mostRepeated.name} (${summary.mostRepeated.visits} cops)`);
  if (summary.bestRated) lines.push(`Millor nota: ${summary.bestRated.name} (${summary.bestRated.rating.toFixed(1)} ★)`);
  if (summary.busiestMonth) lines.push(`Mes més actiu: ${monthName(summary.busiestMonth.month)}`);
  if (summary.wishesFulfilled) lines.push(`${plural(summary.wishesFulfilled, 'desitjat complert', 'desitjats complerts')}`);
  return lines.join('\n');
};
