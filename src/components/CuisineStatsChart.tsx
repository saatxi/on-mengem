import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { Restaurant } from '../types';
import { isVisited } from '../utils/restaurantFields';
import { Utensils, Award, CheckCircle, TrendingUp, Flame } from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  groupName?: string;
}

const BAR_COLORS = [
  '#ea580c', // orange-600
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

export const CuisineStatsChart: React.FC<Props> = ({ restaurants, groupName }) => {
  const [viewMode, setViewMode] = useState<'visited' | 'all'>('visited');

  // Compute distribution of cuisines
  const chartData = useMemo(() => {
    const cuisineMap: {
      [cuisine: string]: {
        cuisine: string;
        visited: number;
        favorites: number;
        total: number;
      };
    } = {};

    restaurants.forEach((r) => {
      const cuisine = r.cuisine?.trim() || 'Altres';
      if (!cuisineMap[cuisine]) {
        cuisineMap[cuisine] = {
          cuisine,
          visited: 0,
          favorites: 0,
          total: 0,
        };
      }
      cuisineMap[cuisine].total += 1;
      // «Vegades visitat» suma les visites reals de cada restaurant.
      cuisineMap[cuisine].visited += r.visits.length;
      if (r.favorite) {
        cuisineMap[cuisine].favorites += 1;
      }
    });

    const list = Object.values(cuisineMap);

    // Sort by visited descending or total
    if (viewMode === 'visited') {
      return list
        .filter((item) => item.visited > 0 || item.total > 0)
        .sort((a, b) => b.visited - a.visited || b.favorites - a.favorites);
    } else {
      return list.sort((a, b) => b.total - a.total);
    }
  }, [restaurants, viewMode]);

  // Compute top insights
  const topVisitedCuisine = useMemo(() => {
    if (chartData.length === 0) return null;
    const sorted = [...chartData].sort((a, b) => b.visited - a.visited);
    return sorted[0].visited > 0 ? sorted[0] : null;
  }, [chartData]);

  const topFavoriteCuisine = useMemo(() => {
    if (chartData.length === 0) return null;
    const sorted = [...chartData].sort((a, b) => b.favorites - a.favorites);
    return sorted[0].favorites > 0 ? sorted[0] : null;
  }, [chartData]);

  const totalVisited = restaurants.filter(isVisited).length;

  if (restaurants.length === 0) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 text-center py-10">
        <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-stone-800">Sense dades de cuina encara</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
          Afegeix restaurants i marca'ls com a visitats per començar a veure la distribució gastronòmica del grup.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-stone-900">
              Distribució de Cuines Preferides i Visitades
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Nombre de vegades que el grup {groupName ? `"${groupName}"` : ''} ha visitat cada tipus de cuina
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl bg-stone-100 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setViewMode('visited')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'visited' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Només visitats
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Tots els catalogats
          </button>
        </div>
      </div>

      {/* Top Insights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/70">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-orange-600" />
            <span>Cuina Més Visitada</span>
          </div>
          <div className="text-lg font-black text-stone-900">
            {topVisitedCuisine ? topVisitedCuisine.cuisine : 'Cap encara'}
          </div>
          <div className="text-xs text-stone-600 mt-0.5 font-medium">
            {topVisitedCuisine ? `${topVisitedCuisine.visited} restaurants visitats` : 'Sense visites registrades'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Més Favorita del Grup</span>
          </div>
          <div className="text-lg font-black text-stone-900">
            {topFavoriteCuisine ? topFavoriteCuisine.cuisine : 'Cap encara'}
          </div>
          <div className="text-xs text-stone-600 mt-0.5 font-medium">
            {topFavoriteCuisine ? `${topFavoriteCuisine.favorites} guardats a favorits ★` : 'Sense favorits'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Total Restaurants Visitats</span>
          </div>
          <div className="text-lg font-black text-stone-900">
            {totalVisited} de {restaurants.length}
          </div>
          <div className="text-xs text-stone-600 mt-0.5 font-medium">
            {restaurants.length > 0 ? `${Math.round((totalVisited / restaurants.length) * 100)}% de la col·lecció provada` : '0%'}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="cuisine"
              tick={{ fontSize: 11, fill: '#64748b' }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#cbd5e1"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-stone-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-stone-800">
                      <p className="font-bold text-sm text-orange-400 border-b border-stone-800 pb-1">
                        {label}
                      </p>
                      <div className="flex justify-between gap-4">
                        <span className="text-stone-300">Vegades visitat:</span>
                        <span className="font-bold text-emerald-400">{data.visited}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-stone-300">Preferits ★:</span>
                        <span className="font-bold text-amber-400">{data.favorites}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-stone-300">Total al catàleg:</span>
                        <span className="font-bold text-stone-100">{data.total}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <Bar
              name="Vegades visitat"
              dataKey="visited"
              fill="#ea580c"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
            <Bar
              name="Preferits ★"
              dataKey="favorites"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
