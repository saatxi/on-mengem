import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRealtimeData } from './hooks/useRealtimeData';
import { Navbar } from './components/Navbar';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { AddWishlistModal } from './components/AddWishlistModal';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { ShareToGroupModal } from './components/ShareToGroupModal';
import { ProfileModal } from './components/ProfileModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorToast } from './components/ErrorToast';
import { GroupMembers } from './components/GroupMembers';
import { CuisineStatsChart } from './components/CuisineStatsChart';
import { StatTiles } from './components/StatTiles';
import { AlertsFeed } from './components/AlertsFeed';
import { BottomNav } from './components/BottomNav';
import { Restaurant, Visit, WishlistItem } from './types';
import { instagramUrl, isInstagramHandle, isVisited } from './utils/restaurantFields';
import { VisitModal } from './components/VisitModal';
import {
  Utensils,
  BookmarkPlus,
  Users,
  Bell,
  Search,
  Plus,
  Star,
  MapPin,
  Phone,
  CheckCircle,
  ExternalLink,
  Instagram,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  BarChart3,
  Copy as CopyIcon,
  ArrowRightLeft
} from 'lucide-react';

type TabType = 'restaurants' | 'wishlist' | 'group' | 'stats' | 'alerts';

function MainApp() {
  const { activeGroup, userGroups, hasProfile, isLoading } = useAuth();
  const {
    isPersonal,
    restaurants,
    wishlist,
    alerts,
    loading: dataLoading,
    error: dataError,
    clearError,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    toggleFavorite,
    saveVisit,
    deleteVisit,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    convertWishlistToRestaurant,
    copyToGroups,
    moveToGroup,
    markAlertAsRead,
    markAllAlertsAsRead,
  } = useRealtimeData();

  const [currentTab, setCurrentTab] = useState<TabType>('restaurants');

  // Modals state
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Es guarda l'id i no l'objecte perquè el detall reflecteixi els canvis en temps real
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [shareTarget, setShareTarget] = useState<
    | { mode: 'copy' | 'move'; type: 'restaurant' | 'wishlist'; id: string; name: string }
    | null
  >(null);
  // Modal de visita: { restaurant, visit? (undefined = nova visita) }
  const [visitTarget, setVisitTarget] = useState<{ restaurant: Restaurant; visit?: Visit } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisited, setFilterVisited] = useState<'all' | 'visited' | 'not_visited'>('all');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('Tots');
  const [copiedGroupCode, setCopiedGroupCode] = useState(false);
  const [showInlineChart, setShowInlineChart] = useState(false);

  // En l'espai personal no hi ha pestanyes de grup ni activitat
  const effectiveTab: TabType =
    isPersonal && (currentTab === 'group' || currentTab === 'alerts') ? 'restaurants' : currentTab;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white animate-spin mb-4">
          <Utensils className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-stone-600">Connectant amb On menjem?...</p>
      </div>
    );
  }

  // If new user with no profile, show onboarding
  if (!hasProfile) {
    return <WelcomeOnboarding />;
  }

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) ?? null;

  // Filter restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (filterFavorite && !r.favorite) return false;
    if (filterVisited === 'visited' && !isVisited(r)) return false;
    if (filterVisited === 'not_visited' && isVisited(r)) return false;
    if (selectedCuisine !== 'Tots' && r.cuisine !== selectedCuisine) return false;
    return true;
  });

  // Extract unique cuisines
  const availableCuisines = [
    'Tots',
    ...Array.from(new Set(restaurants.map((r) => r.cuisine).filter(Boolean) as string[])),
  ];

  const handleCopyGroupCode = () => {
    if (!activeGroup?.code) return;
    navigator.clipboard.writeText(activeGroup.code);
    setCopiedGroupCode(true);
    setTimeout(() => setCopiedGroupCode(false), 2000);
  };

  const handleShareGroupWhatsApp = () => {
    if (!activeGroup) return;
    const text = encodeURIComponent(
      `Uneix-te al meu grup "${activeGroup.name}" a On menjem? amb el codi: ${activeGroup.code} per compartir restaurants i llistes de desitjats en temps real!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-orange-500 selection:text-white pb-24 sm:pb-12">
      {/* Top Navbar */}
      <Navbar
        alerts={alerts}
        onOpenAddRestaurant={() => setShowAddRestaurant(true)}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenJoinGroup={() => setShowJoinGroup(true)}
        onOpenProfile={() => setShowProfile(true)}
        onMarkAlertRead={markAlertAsRead}
        onMarkAllAlertsRead={markAllAlertsAsRead}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-6">
        {/* Navigation Tabs */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 p-1.5 bg-stone-200/70 rounded-2xl mb-6 max-w-full overflow-x-auto">
          <button
            onClick={() => setCurrentTab('restaurants')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              effectiveTab === 'restaurants'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Restaurants ({restaurants.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('wishlist')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              effectiveTab === 'wishlist'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Desitjats ({wishlist.length})</span>
          </button>

          {!isPersonal && (
          <button
            onClick={() => setCurrentTab('group')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              effectiveTab === 'group'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Grup ({activeGroup?.memberUids?.length || 1})</span>
          </button>
          )}

          <button
            onClick={() => setCurrentTab('stats')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              effectiveTab === 'stats'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Gràfic de Cuines</span>
          </button>

          {!isPersonal && (
          <button
            onClick={() => setCurrentTab('alerts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              effectiveTab === 'alerts'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Activitat ({alerts.length})</span>
          </button>
          )}
        </div>

        {/* TAB 1: RESTAURANTS */}
        {effectiveTab === 'restaurants' && (
          <div className="space-y-5">
            {/* Search & Filter Header */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cercar per nom, ciutat, cuina, notes..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-stone-900 outline-hidden transition"
                  />
                </div>

                {/* Add button */}
                <button
                  onClick={() => setShowAddRestaurant(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Afegir Restaurant</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100 text-xs">
                {/* Visited Status */}
                <div className="flex items-center rounded-xl bg-stone-100 p-0.5">
                  <button
                    onClick={() => setFilterVisited('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      filterVisited === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Tots
                  </button>
                  <button
                    onClick={() => setFilterVisited('visited')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      filterVisited === 'visited' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Visitats
                  </button>
                  <button
                    onClick={() => setFilterVisited('not_visited')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      filterVisited === 'not_visited' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                    }`}
                  >
                    Per anar
                  </button>
                </div>

                {/* Favorite filter */}
                <button
                  onClick={() => setFilterFavorite(!filterFavorite)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition border ${
                    filterFavorite
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${filterFavorite ? 'fill-white' : 'fill-amber-400 text-amber-500'}`} />
                  <span>Favorits</span>
                </button>

                {/* Cuisine selector */}
                {availableCuisines.length > 2 && (
                  <select
                    value={selectedCuisine}
                    onChange={(e) => setSelectedCuisine(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 font-medium focus:border-orange-500 outline-hidden"
                  >
                    {availableCuisines.map((c) => (
                      <option key={c} value={c}>
                        {c === 'Tots' ? 'Totes les cuines' : c}
                      </option>
                    ))}
                  </select>
                )}

                {/* Inline chart toggle */}
                <button
                  onClick={() => setShowInlineChart(!showInlineChart)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition border ${
                    showInlineChart
                      ? 'bg-orange-600 text-white border-orange-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                  title="Mostra o amaga el gràfic de barres de cuines"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{showInlineChart ? 'Amagar Gràfic' : 'Gràfic de Cuines'}</span>
                </button>

                <span className="ml-auto text-stone-400 text-[11px] font-medium">
                  {filteredRestaurants.length} de {restaurants.length} llocs
                </span>
              </div>
            </div>

            {/* Inline Cuisine Distribution Chart */}
            {showInlineChart && (
              <CuisineStatsChart
                restaurants={restaurants}
                groupName={activeGroup?.name}
              />
            )}

            {/* Restaurant Cards Grid */}
            {dataLoading ? (
              <div className="py-12 text-center text-sm text-stone-400">
                Sincronitzant restaurants en temps real...
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-stone-200/80 p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl">
                  🍽️
                </div>
                <h3 className="text-base font-bold text-stone-800">Cap restaurant trobat</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {searchQuery || filterFavorite || filterVisited !== 'all'
                    ? 'No hi ha resultats amb els filtres seleccionats.'
                    : isPersonal ? 'El teu espai personal és buit. Afegeix els teus restaurants i després comparteix-los amb els teus grups!' : 'Encara no hi ha restaurants al grup. Sigues el primer a afegir-ne un!'}
                </p>
                <button
                  onClick={() => setShowAddRestaurant(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition"
                >
                  <Plus className="w-4 h-4" /> Afegir el primer restaurant
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRestaurants.map((res) => {
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedRestaurantId(res.id)}
                      className="group bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-orange-200 transition flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                {res.cuisine || 'Restaurant'}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-mono">
                                {res.priceRange || '—'}
                              </span>
                              {isVisited(res) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> {res.visits.length === 1 ? '1 visita' : `${res.visits.length} visites`}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-bold text-stone-900 group-hover:text-orange-600 transition">
                              {res.name}
                            </h3>
                          </div>

                          {/* Favorite toggle button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(res);
                            }}
                            className={`p-1.5 rounded-full transition ${
                              res.favorite ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-stone-400'
                            }`}
                            title={res.favorite ? 'Treure de favorits' : 'Afegir a favorits'}
                          >
                            <Star className={`w-4 h-4 ${res.favorite ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>

                        {/* Rating & City */}
                        <div className="flex items-center gap-3 text-xs text-stone-500 mb-2.5">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span className="font-bold text-stone-800">{res.rating?.toFixed(1) || '4.0'}</span>
                          </div>
                          {res.city && (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-stone-400" />
                              <span className="truncate">{res.city}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes preview */}
                        {res.notes && (
                          <p className="text-xs text-stone-600 line-clamp-2 italic mb-3 bg-stone-50/80 p-2 rounded-xl">
                            "{res.notes}"
                          </p>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-stone-400">
                          Per: <strong className="text-stone-600">{res.createdByName || 'Membre'}</strong>
                        </span>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {res.phone && (
                            <a
                              href={`tel:${res.phone}`}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              title={`Trucar a ${res.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setVisitTarget({ restaurant: res })}
                            className="p-1.5 rounded-lg text-xs font-semibold transition bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Registrar visita"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WISHLIST (LLISTA DE DESITJATS) */}
        {effectiveTab === 'wishlist' && (
          <div className="space-y-5">
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <BookmarkPlus className="w-5 h-5 text-amber-500" />
                  Llista de Desitjats Culinària
                </h2>
                <p className="text-xs text-stone-500">
                  {isPersonal
                    ? 'Llocs que vols provar, només visibles per a tu.'
                    : 'Restaurants pendents que algú del grup ha recomanat o vol anar a provar.'}
                </p>
              </div>

              <button
                onClick={() => setShowAddWishlist(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Proposar Desitjat</span>
              </button>
            </div>

            {wishlist.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                  ✨
                </div>
                <h3 className="text-base font-bold text-stone-800">No hi ha llocs desitjats pendents</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  T'han recomanat un restaurant interessant? Afegeix-lo aquí perquè el grup el pugui provar!
                </p>
                <button
                  onClick={() => setShowAddWishlist(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition"
                >
                  <Plus className="w-4 h-4" /> Afegir el primer desitjat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wishlist.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs hover:border-amber-300 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                                {item.cuisine || 'Pendent'}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono">
                                {item.priceRange || '—'}
                              </span>
                              {item.status === 'visited' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                  Ja provat!
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-stone-900">{item.restaurantName}</h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isInstagramHandle(item.instagram) && (
                              <a
                                href={instagramUrl(item.instagram)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-pink-600 transition"
                                title={`Obrir @${item.instagram} a Instagram`}
                              >
                                <Instagram className="w-4 h-4" />
                              </a>
                            )}
                            {item.link && /^https?:\/\//i.test(item.link) && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                title="Obrir enllaç"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {item.recommendedBy && (
                          <div className="text-xs text-amber-900 font-medium bg-amber-50/70 p-2 rounded-xl mb-2.5">
                            💡 <strong>Recomanació:</strong> {item.recommendedBy}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-xs text-stone-600 mb-3 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400">
                          Proposat per: <strong className="text-stone-600">{item.userName || 'Membre'}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShareTarget({ mode: 'copy', type: 'wishlist', id: item.id, name: item.restaurantName })}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition"
                            title="Copiar a un grup"
                          >
                            <CopyIcon className="w-3.5 h-3.5" />
                          </button>
                          {isPersonal && (
                            <button
                              onClick={() => setShareTarget({ mode: 'move', type: 'wishlist', id: item.id, name: item.restaurantName })}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition"
                              title="Moure a un grup"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteWishlistItem(item.id)}
                            className="text-xs text-stone-400 hover:text-red-600 px-2 py-1 rounded transition"
                          >
                            Eliminar
                          </button>
                          {item.status !== 'visited' && (
                            <button
                              onClick={() => convertWishlistToRestaurant(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                              title="Afegeix-lo directament a la llista de restaurants"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Ja hi hem anat!</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EL MEU GRUP (GROUPS) */}
        {effectiveTab === 'group' && (
          <div className="space-y-6">
            {/* Active Group Card */}
            <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold tracking-wide uppercase border border-orange-500/30">
                      Grup Actiu
                    </span>
                    <span className="text-xs text-stone-400">
                      Creador: {activeGroup?.ownerName || 'Administrador'}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {activeGroup?.name || 'Grup On menjem?'}
                  </h2>
                  <p className="mt-1 text-sm text-stone-300 max-w-lg">
                    {activeGroup?.description || 'Espai compartit per recopilar restaurants i desitjats amb sincronització en temps real.'}
                  </p>
                </div>

                {/* Shareable Invite Box */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 w-full md:w-auto">
                  <div className="text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Codi d'Invitació del Grup
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="px-4 py-2 bg-white/20 rounded-xl font-mono text-xl font-black tracking-widest text-amber-300 text-center">
                      {activeGroup?.code || 'XXXXXX'}
                    </div>
                    <button
                      onClick={handleCopyGroupCode}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition active:scale-95 shadow-xs"
                    >
                      {copiedGroupCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedGroupCode ? 'Copiat!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <button
                    onClick={handleShareGroupWhatsApp}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir per WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-white/10 text-center">
                <div>
                  <div className="text-2xl font-black text-white">{restaurants.length}</div>
                  <div className="text-xs text-stone-400">Restaurants</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-400">{restaurants.filter(isVisited).length}</div>
                  <div className="text-xs text-stone-400">Ja visitats</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-orange-400">{wishlist.length}</div>
                  <div className="text-xs text-stone-400">Desitjats pendents</div>
                </div>
              </div>
            </div>

            {/* Cuisine Distribution Chart using Recharts */}
            <CuisineStatsChart
              restaurants={restaurants}
              groupName={activeGroup?.name}
            />

            {activeGroup && (
              <GroupMembers
                group={activeGroup}
                onJoinGroup={() => setShowJoinGroup(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            )}
          </div>
        )}

        {/* TAB: STATS / GRÀFIC DE CUINES */}
        {effectiveTab === 'stats' && (
          <div className="space-y-6">
            <StatTiles restaurants={restaurants} wishlistCount={wishlist.length} />
            <CuisineStatsChart
              restaurants={restaurants}
              groupName={activeGroup?.name}
            />
          </div>
        )}

        {/* TAB 4: ALERTS / TIMELINE */}
        {effectiveTab === 'alerts' && (
          <AlertsFeed alerts={alerts} markAllAlertsAsRead={markAllAlertsAsRead} />
        )}
      </main>

      {/* Floating Add Restaurant Action for Mobile */}
      <button
        onClick={() => setShowAddRestaurant(true)}
        className="fixed bottom-20 right-6 sm:hidden z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-2xl shadow-orange-600/40 active:scale-90 transition"
        title="Afegir restaurant"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modals */}
      <AddRestaurantModal
        isOpen={showAddRestaurant}
        onClose={() => setShowAddRestaurant(false)}
        onSave={(data, createVisitToday) => addRestaurant(data, createVisitToday)}
      />

      <AddWishlistModal
        isOpen={showAddWishlist}
        onClose={() => setShowAddWishlist(false)}
        onAdd={addWishlistItem}
      />

      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurantId(null)}
        onEdit={setEditingRestaurant}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteRestaurant}
        onRegisterVisit={(r, v) => setVisitTarget({ restaurant: r, visit: v })}
        onDeleteVisit={deleteVisit}
        onCopyToGroup={(r) => {
          setSelectedRestaurantId(null);
          setShareTarget({ mode: 'copy', type: 'restaurant', id: r.id, name: r.name });
        }}
        onMoveToGroup={isPersonal ? (r) => {
          setSelectedRestaurantId(null);
          setShareTarget({ mode: 'move', type: 'restaurant', id: r.id, name: r.name });
        } : undefined}
      />

      <AddRestaurantModal
        key={editingRestaurant?.id ?? 'edit'}
        isOpen={!!editingRestaurant}
        restaurant={editingRestaurant}
        onClose={() => setEditingRestaurant(null)}
        onSave={async (data) => {
          if (editingRestaurant) await updateRestaurant(editingRestaurant.id, data as Partial<Restaurant>);
        }}
      />

      <ShareToGroupModal
        isOpen={!!shareTarget}
        mode={shareTarget?.mode ?? 'copy'}
        itemName={shareTarget?.name ?? ''}
        groups={userGroups.filter((g) => g.id !== activeGroup?.id)}
        onClose={() => setShareTarget(null)}
        onConfirm={async (groupIds) => {
          if (!shareTarget) return;
          if (shareTarget.mode === 'move') await moveToGroup(shareTarget.type, shareTarget.id, groupIds[0]);
          else await copyToGroups(shareTarget.type, shareTarget.id, groupIds);
        }}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      <JoinGroupModal
        isOpen={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <VisitModal
        restaurant={visitTarget?.restaurant ?? null}
        visit={visitTarget?.visit}
        onClose={() => setVisitTarget(null)}
        onSave={saveVisit}
      />

      <ErrorToast message={dataError} onClose={clearError} />

      <BottomNav
        activeTab={effectiveTab}
        onTabChange={setCurrentTab}
        isPersonal={isPersonal}
        alertCount={alerts.length}
      />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
