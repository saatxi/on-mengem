import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useRealtimeData } from './hooks/useRealtimeData';
import { Navbar } from './components/Navbar';
import { AddRestaurantModal } from './components/AddRestaurantModal';
import { WishlistModal } from './components/WishlistModal';
import { RestaurantDetailModal } from './components/RestaurantDetailModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { ShareToGroupModal } from './components/ShareToGroupModal';
import { ProfileModal } from './components/ProfileModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Toast } from './components/Toast';
import { GroupMembers } from './components/GroupMembers';
import { GroupHistory } from './components/GroupHistory';
import { CuisineStatsChart } from './components/CuisineStatsChart';
import { StatTiles } from './components/StatTiles';
import { AlertsFeed } from './components/AlertsFeed';
import { BottomNav } from './components/BottomNav';
import { RestaurantCard } from './components/RestaurantCard';
import { WishlistCard } from './components/WishlistCard';
import { TabButton } from './components/TabButton';
import { CardSkeletons } from './components/CardSkeletons';
import { Restaurant, Visit, WishlistItem } from './types';
import { isVisited, matchesQuery, RESTAURANT_SORTS, sortRestaurants, type RestaurantSort } from './utils/restaurantFields';
import { VisitModal } from './components/VisitModal';
import { WelcomeTour } from './components/WelcomeTour';
import { consumeLoginTourPending } from './utils/loginTour';
import { useRestaurantLink } from './hooks/useRestaurantLink';
import { isBoolean, isString, oneOf, usePersistentState } from './hooks/usePersistentState';
import { Utensils, UtensilsCrossed, Sparkles, BookmarkPlus, Users, Bell, Search, Plus, Star, Share2, Copy, Check, BarChart3, X, Dices, List, Map as MapIcon } from 'lucide-react';
import { cn } from './utils/cn';
import { CARD, FIELD } from './utils/ui';
import { Button } from './components/Button';

// Leaflet només es descarrega quan s'obre la vista de mapa.
const RestaurantMap = lazy(() => import('./components/RestaurantMap').then((m) => ({ default: m.RestaurantMap })));

const TABS = ['restaurants', 'wishlist', 'group', 'stats', 'alerts'] as const;
type TabType = (typeof TABS)[number];

const RESTAURANT_VIEWS = ['list', 'map'] as const;
type RestaurantView = (typeof RESTAURANT_VIEWS)[number];

const VISITED_FILTERS = { all: 'Tots', visited: 'Visitats', not_visited: 'Per anar' } as const;
type VisitedFilter = keyof typeof VISITED_FILTERS;

const WISHLIST_FILTERS = { all: 'Tots', pending: 'Pendents', planned: 'Planificats', visited: 'Provats' } as const;
type WishlistFilter = keyof typeof WISHLIST_FILTERS;

// Temps per desfer l'eliminació d'un desitjat abans d'esborrar-lo de debò (una mica més que l'avís)
const UNDO_DELETE_MS = 5000;

const segmentClass = (active: boolean) =>
  cn('px-3.5 py-1.5 rounded-full font-semibold transition-[background-color,color,box-shadow]', active ? 'bg-surface text-stone-900 shadow-card' : 'text-stone-600 hover:text-stone-900');

// Botons i selectors petits de la barra de filtres
const CHIP = 'flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold transition-[background-color,color,transform] active:scale-[0.96]';
const CHIP_IDLE = 'bg-surface text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100';
const CHIP_SELECT = 'px-3.5 py-2 rounded-full bg-surface ring-1 ring-stone-200 text-xs text-stone-700 font-medium focus:ring-2 focus:ring-accent outline-hidden';

// Estat buit d'una llista
const EMPTY_STATE = cn(CARD, 'py-16 px-8 text-center space-y-3');

const keysOf = <T extends object>(obj: T) => Object.keys(obj) as (keyof T & string)[];

// Pantalla principal amb la sessió iniciada i el perfil creat (App la carrega només llavors).
export function MainApp() {
  const { activeGroup, userGroups, hasProfile, authUser } = useAuth();
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
    locateRestaurants,
    saveVisit,
    deleteVisit,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    convertWishlistToRestaurant,
    copyToGroups,
    moveToGroup,
    markAllAlertsAsRead,
  } = useRealtimeData();

  const [currentTab, setCurrentTab] = usePersistentState<TabType>('tab', 'restaurants', oneOf(...TABS));

  // Modals state
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [editingWishlist, setEditingWishlist] = useState<WishlistItem | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTour, setShowTour] = useState(false);
  // Es guarda l'id i no l'objecte perquè el detall reflecteixi els canvis en temps real
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  // Restaurant triat amb «Sorprèn-me»: el detall el destaca i permet tornar a tirar
  const [randomPickId, setRandomPickId] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [shareTarget, setShareTarget] = useState<
    | { mode: 'copy' | 'move'; type: 'restaurant' | 'wishlist'; id: string; name: string }
    | null
  >(null);
  // Modal de visita: { restaurant, visit? (undefined = nova visita) }
  const [visitTarget, setVisitTarget] = useState<{ restaurant: Restaurant; visit?: Visit } | null>(null);
  // Modal de conversió desitjat → restaurant
  const [wishlistToConvert, setWishlistToConvert] = useState<WishlistItem | null>(null);

  // Filtres i ordenació (la cerca no es recorda; la resta, sí)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisited, setFilterVisited] = usePersistentState<VisitedFilter>('filter-visited', 'all', oneOf(...keysOf(VISITED_FILTERS)));
  const [filterFavorite, setFilterFavorite] = usePersistentState('filter-favorite', false, isBoolean);
  const [selectedCuisine, setSelectedCuisine] = usePersistentState('filter-cuisine', 'Tots', isString);
  const [sort, setSort] = usePersistentState<RestaurantSort>('sort', 'recent', oneOf(...keysOf(RESTAURANT_SORTS)));
  const [restaurantView, setRestaurantView] = usePersistentState<RestaurantView>('restaurant-view', 'list', oneOf(...RESTAURANT_VIEWS));
  const [wishlistQuery, setWishlistQuery] = useState('');
  const [wishlistFilter, setWishlistFilter] = usePersistentState<WishlistFilter>('filter-wishlist', 'all', oneOf(...keysOf(WISHLIST_FILTERS)));
  const [copiedGroupCode, setCopiedGroupCode] = useState(false);

  // Avís d'èxit (amb acció opcional, p. ex. «Desfer»)
  const [notice, setNotice] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);
  const notify = (message: string, action?: { label: string; onClick: () => void }) => setNotice({ message, action });

  // Desitjats eliminats que encara es poden recuperar: s'amaguen de seguida i s'esborren passat UNDO_DELETE_MS
  const [hiddenWishlistIds, setHiddenWishlistIds] = useState<string[]>([]);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Enllaç directe (?r=<id>): el hook canvia a l'espai del restaurant i aquí se n'obre el detall.
  const { error: linkError, clearError: clearLinkError } = useRestaurantLink((restaurantId) => {
    setCurrentTab('restaurants');
    setSelectedRestaurantId(restaurantId);
  });

  // Guia de benvinguda just després d'iniciar sessió (no quan es torna a l'app amb la sessió oberta)
  useEffect(() => {
    if (hasProfile && consumeLoginTourPending()) setShowTour(true);
  }, [hasProfile]);

  // En l'espai personal no hi ha pestanyes de grup ni activitat
  const effectiveTab: TabType =
    isPersonal && (currentTab === 'group' || currentTab === 'alerts') ? 'restaurants' : currentTab;

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) ?? null;

  // Cuines d'aquest espai; la desada pot ser d'un altre espai i llavors no filtra
  const availableCuisines = [
    'Tots',
    ...Array.from(new Set(restaurants.map((r) => r.cuisine).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ca')),
  ];
  const cuisineFilter = availableCuisines.includes(selectedCuisine) ? selectedCuisine : 'Tots';

  const filteredRestaurants = sortRestaurants(
    restaurants.filter((r) => {
      if (!matchesQuery(searchQuery, [r.name, r.cuisine, r.address, r.notes])) return false;
      if (filterFavorite && !r.favorite) return false;
      if (filterVisited === 'visited' && !isVisited(r)) return false;
      if (filterVisited === 'not_visited' && isVisited(r)) return false;
      if (cuisineFilter !== 'Tots' && r.cuisine !== cuisineFilter) return false;
      return true;
    }),
    sort,
  );

  const hasRestaurantFilters = searchQuery.trim() !== '' || filterFavorite || filterVisited !== 'all' || cuisineFilter !== 'Tots';
  const clearRestaurantFilters = () => {
    setSearchQuery('');
    setFilterFavorite(false);
    setFilterVisited('all');
    setSelectedCuisine('Tots');
  };

  // «On mengem avui?»: obre un restaurant a l'atzar d'entre els que es veuen amb els filtres actuals
  const openRandomRestaurant = () => {
    // En tornar a tirar no surt el mateix restaurant (si n'hi ha d'altres)
    const candidates = filteredRestaurants.length > 1 ? filteredRestaurants.filter((r) => r.id !== selectedRestaurantId) : filteredRestaurants;
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setSelectedRestaurantId(pick.id);
    setRandomPickId(pick.id);
  };

  const closeRestaurantDetail = () => {
    setSelectedRestaurantId(null);
    setRandomPickId(null);
  };

  const visibleWishlist = wishlist.filter((w) => !hiddenWishlistIds.includes(w.id));
  const filteredWishlist = visibleWishlist.filter(
    (w) =>
      (wishlistFilter === 'all' || (w.status ?? 'pending') === wishlistFilter) &&
      matchesQuery(wishlistQuery, [w.restaurantName, w.cuisine, w.address, w.notes, w.recommendedBy]),
  );
  const hasWishlistFilters = wishlistQuery.trim() !== '' || wishlistFilter !== 'all';
  const clearWishlistFilters = () => {
    setWishlistQuery('');
    setWishlistFilter('all');
  };

  const unreadAlertCount = alerts.filter((a) => authUser && !a.readBy?.includes(authUser.uid)).length;

  const handleDeleteWishlist = (item: WishlistItem) => {
    setHiddenWishlistIds((ids) => [...ids, item.id]);
    const restore = () => setHiddenWishlistIds((ids) => ids.filter((id) => id !== item.id));
    const timer = setTimeout(() => {
      pendingDeletes.current.delete(item.id);
      // Si falla, l'error surt a l'avís vermell i el desitjat torna a aparèixer
      deleteWishlistItem(item.id).finally(restore);
    }, UNDO_DELETE_MS);
    pendingDeletes.current.set(item.id, timer);
    notify(`«${item.restaurantName}» eliminat`, {
      label: 'Desfer',
      onClick: () => {
        clearTimeout(timer);
        pendingDeletes.current.delete(item.id);
        restore();
      },
    });
  };

  const handleCopyGroupCode = () => {
    if (!activeGroup?.code) return;
    navigator.clipboard.writeText(activeGroup.code);
    setCopiedGroupCode(true);
    setTimeout(() => setCopiedGroupCode(false), 2000);
  };

  const handleShareGroupWhatsApp = () => {
    if (!activeGroup) return;
    const text = encodeURIComponent(
      `Uneix-te al meu grup "${activeGroup.name}" a On mengem? amb el codi: ${activeGroup.code} per compartir restaurants i llistes de desitjats en temps real!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen flex flex-col pb-[calc(var(--bottom-nav-h)+5.5rem)] sm:pb-12">
      {/* Top Navbar */}
      <Navbar
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenJoinGroup={() => setShowJoinGroup(true)}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-6">
        {/* Navigation Tabs */}
        <div className="hidden sm:flex w-fit items-center gap-1 p-1.5 bg-stone-200/60 rounded-full mb-6 max-w-full overflow-x-auto">
          <TabButton
            icon={Utensils}
            label={`Restaurants (${restaurants.length})`}
            active={effectiveTab === 'restaurants'}
            onClick={() => setCurrentTab('restaurants')}
          />
          <TabButton
            icon={BookmarkPlus}
            label={`Desitjats (${visibleWishlist.length})`}
            active={effectiveTab === 'wishlist'}
            onClick={() => setCurrentTab('wishlist')}
          />
          {!isPersonal && (
            <TabButton
              icon={Users}
              label={`Grup (${activeGroup?.memberUids?.length || 1})`}
              active={effectiveTab === 'group'}
              onClick={() => setCurrentTab('group')}
            />
          )}
          <TabButton
            icon={BarChart3}
            label="Resum"
            active={effectiveTab === 'stats'}
            onClick={() => setCurrentTab('stats')}
          />
          {!isPersonal && (
            <TabButton
              icon={Bell}
              label={unreadAlertCount > 0 ? `Activitat (${unreadAlertCount})` : 'Activitat'}
              active={effectiveTab === 'alerts'}
              onClick={() => setCurrentTab('alerts')}
            />
          )}
        </div>

        {/* TAB 1: RESTAURANTS */}
        {effectiveTab === 'restaurants' && (
          <div className="space-y-5">
            {/* Search & Filter Header */}
            <div className={cn(CARD, 'p-4 sm:p-5 space-y-3')}>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cercar per nom, adreça, cuina, notes..."
                    aria-label="Cercar restaurants"
                    className={cn(FIELD, 'pl-11 bg-stone-50')}
                  />
                </div>

                {/* Add button */}
                <Button onClick={() => setShowAddRestaurant(true)} variant="brand" className="hidden sm:inline-flex">
                  <Plus className="w-4 h-4" />
                  <span>Afegir restaurant</span>
                </Button>
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100 text-xs">
                <div className="flex items-center rounded-full bg-stone-100 p-1" role="group" aria-label="Vista">
                  <button onClick={() => setRestaurantView('list')} aria-pressed={restaurantView === 'list'} className={cn(segmentClass(restaurantView === 'list'), 'flex items-center gap-1.5')}>
                    <List className="w-3.5 h-3.5" /> Llista
                  </button>
                  <button onClick={() => setRestaurantView('map')} aria-pressed={restaurantView === 'map'} className={cn(segmentClass(restaurantView === 'map'), 'flex items-center gap-1.5')}>
                    <MapIcon className="w-3.5 h-3.5" /> Mapa
                  </button>
                </div>

                <div className="flex items-center rounded-full bg-stone-100 p-1" role="group" aria-label="Estat de visita">
                  {keysOf(VISITED_FILTERS).map((key) => (
                    <button key={key} onClick={() => setFilterVisited(key)} aria-pressed={filterVisited === key} className={segmentClass(filterVisited === key)}>
                      {VISITED_FILTERS[key]}
                    </button>
                  ))}
                </div>

                {/* Favorite filter */}
                <button
                  onClick={() => setFilterFavorite(!filterFavorite)}
                  aria-pressed={filterFavorite}
                  className={cn(CHIP, filterFavorite ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' : CHIP_IDLE)}
                >
                  <Star className={`w-3.5 h-3.5 ${filterFavorite ? 'fill-white' : 'fill-amber-400 text-amber-500'}`} />
                  <span>Favorits</span>
                </button>

                {/* Cuisine selector */}
                {availableCuisines.length > 2 && (
                  <select
                    value={cuisineFilter}
                    onChange={(e) => setSelectedCuisine(e.target.value)}
                    aria-label="Cuina"
                    className={CHIP_SELECT}
                  >
                    {availableCuisines.map((c) => (
                      <option key={c} value={c}>
                        {c === 'Tots' ? 'Totes les cuines' : c}
                      </option>
                    ))}
                  </select>
                )}


                <button
                  onClick={openRandomRestaurant}
                  disabled={filteredRestaurants.length === 0}
                  title="Obre un dels restaurants de la llista a l'atzar"
                  className={cn(CHIP, CHIP_IDLE, 'disabled:opacity-40')}
                >
                  <Dices className="w-3.5 h-3.5 text-accent" />
                  <span>Sorprèn-me</span>
                </button>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as RestaurantSort)}
                  aria-label="Ordena per"
                  className={CHIP_SELECT}
                >
                  {keysOf(RESTAURANT_SORTS).map((key) => (
                    <option key={key} value={key}>
                      {RESTAURANT_SORTS[key]}
                    </option>
                  ))}
                </select>

                {hasRestaurantFilters && (
                  <button
                    onClick={clearRestaurantFilters}
                    className={cn(CHIP, 'gap-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100')}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Netejar filtres</span>
                  </button>
                )}

                <span className="ml-auto text-stone-500 text-xs font-medium" aria-live="polite">
                  {filteredRestaurants.length} de {restaurants.length} llocs
                </span>
              </div>
            </div>

            {/* Restaurant Cards Grid */}
            {dataLoading ? (
              <CardSkeletons className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />
            ) : filteredRestaurants.length === 0 ? (
              <div className={EMPTY_STATE}>
                <div className="w-16 h-16 rounded-3xl bg-brand text-white shadow-lg shadow-accent/30 flex items-center justify-center mx-auto -rotate-6">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Cap restaurant trobat</h3>
                <p className="text-sm text-stone-500 max-w-sm mx-auto">
                  {hasRestaurantFilters
                    ? 'No hi ha resultats amb els filtres seleccionats.'
                    : isPersonal ? 'El teu espai personal és buit. Afegeix els teus restaurants i després comparteix-los amb els teus grups!' : 'Encara no hi ha restaurants al grup. Sigues el primer a afegir-ne un!'}
                </p>
                {hasRestaurantFilters ? (
                  <Button onClick={clearRestaurantFilters} variant="secondary">
                    <X className="w-4 h-4" /> Netejar filtres
                  </Button>
                ) : (
                  <Button onClick={() => setShowAddRestaurant(true)} variant="brand">
                    <Plus className="w-4 h-4" /> Afegir el primer restaurant
                  </Button>
                )}
              </div>
            ) : restaurantView === 'map' ? (
              <Suspense fallback={<div className={cn(CARD, 'h-[60vh] min-h-80 animate-pulse')} />}>
                <RestaurantMap
                  restaurants={filteredRestaurants}
                  onOpen={(r) => setSelectedRestaurantId(r.id)}
                  onLocate={locateRestaurants}
                />
              </Suspense>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                {filteredRestaurants.map((res) => (
                  <RestaurantCard
                    key={res.id}
                    res={res}
                    onOpen={(r) => setSelectedRestaurantId(r.id)}
                    onToggleFavorite={toggleFavorite}
                    onRegisterVisit={(r) => setVisitTarget({ restaurant: r })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WISHLIST (LLISTA DE DESITJATS) */}
        {effectiveTab === 'wishlist' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 flex items-center gap-2.5">
                  <span className="size-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                    <BookmarkPlus className="w-5 h-5" />
                  </span>
                  Llista de desitjats
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {isPersonal
                    ? 'Llocs que vols provar, només visibles per a tu.'
                    : 'Restaurants pendents que algú del grup ha recomanat o vol anar a provar.'}
                </p>
              </div>

              <Button onClick={() => setShowAddWishlist(true)} variant="wish" className="hidden sm:inline-flex">
                <Plus className="w-4 h-4" />
                <span>Proposar desitjat</span>
              </Button>
            </div>

            {visibleWishlist.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={wishlistQuery}
                    onChange={(e) => setWishlistQuery(e.target.value)}
                    placeholder="Cercar per nom, cuina, qui ho recomana..."
                    aria-label="Cercar desitjats"
                    className={cn(FIELD, 'pl-11')}
                  />
                </div>
                <div className="flex items-center self-start rounded-full bg-stone-200/60 p-1 overflow-x-auto max-w-full" role="group" aria-label="Estat del desitjat">
                  {keysOf(WISHLIST_FILTERS).map((key) => (
                    <button key={key} onClick={() => setWishlistFilter(key)} aria-pressed={wishlistFilter === key} className={cn(segmentClass(wishlistFilter === key), 'whitespace-nowrap')}>
                      {WISHLIST_FILTERS[key]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dataLoading ? (
              <CardSkeletons count={4} className="grid grid-cols-1 md:grid-cols-2 gap-4" />
            ) : visibleWishlist.length === 0 ? (
              <div className={EMPTY_STATE}>
                <div className="w-16 h-16 rounded-3xl bg-violet-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center mx-auto -rotate-6">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-stone-900">No hi ha llocs desitjats pendents</h3>
                <p className="text-sm text-stone-500 max-w-sm mx-auto">
                  T'han recomanat un restaurant interessant? Afegeix-lo aquí perquè el grup el pugui provar!
                </p>
                <Button onClick={() => setShowAddWishlist(true)} variant="wish">
                  <Plus className="w-4 h-4" /> Afegir el primer desitjat
                </Button>
              </div>
            ) : filteredWishlist.length === 0 ? (
              <div className={cn(EMPTY_STATE, 'py-12')}>
                <h3 className="text-lg font-extrabold tracking-tight text-stone-900">Cap desitjat amb aquests filtres</h3>
                {hasWishlistFilters && (
                  <Button onClick={clearWishlistFilters} variant="secondary">
                    <X className="w-4 h-4" /> Netejar filtres
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
                {filteredWishlist.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onCopy={(w) => setShareTarget({ mode: 'copy', type: 'wishlist', id: w.id, name: w.restaurantName })}
                    onMove={isPersonal ? (w) => setShareTarget({ mode: 'move', type: 'wishlist', id: w.id, name: w.restaurantName }) : undefined}
                    onEdit={setEditingWishlist}
                    onDelete={handleDeleteWishlist}
                    onTogglePlanned={(w) => updateWishlistItem(w.id, { status: w.status === 'planned' ? 'pending' : 'planned' })}
                    onMarkVisited={setWishlistToConvert}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EL MEU GRUP (GROUPS) */}
        {effectiveTab === 'group' && (
          <div className="space-y-6">
            {/* Grup actiu i codi d'invitació */}
            <div className={cn(CARD, 'p-5 sm:p-7')}>
              <div className="flex flex-col md:flex-row justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-accent">
                    Grup actiu{activeGroup?.ownerName ? ` · creat per ${activeGroup.ownerName}` : ''}
                  </p>
                  <h2 className="mt-1 text-3xl font-extrabold text-stone-900 tracking-tight break-words">
                    {activeGroup?.name}
                  </h2>
                  {activeGroup?.description && (
                    <p className="mt-1 text-sm text-stone-600 max-w-lg">{activeGroup.description}</p>
                  )}
                </div>

                <div className="w-full md:w-80 shrink-0 p-4 rounded-3xl bg-accent-soft">
                  <p className="text-sm font-semibold text-orange-900 mb-2">Codi d'invitació</p>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2 rounded-2xl bg-surface font-mono text-xl font-bold tracking-[0.3em] text-stone-900 text-center shadow-card">
                      {activeGroup?.code}
                    </span>
                    <Button onClick={handleCopyGroupCode} size="lg" className="px-4">
                      {copiedGroupCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedGroupCode ? 'Copiat' : 'Copiar'}</span>
                    </Button>
                  </div>
                  <Button onClick={handleShareGroupWhatsApp} variant="success" className="mt-2 w-full">
                    <Share2 className="w-4 h-4" />
                    <span>Compartir per WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>

            {activeGroup && (
              <GroupMembers
                group={activeGroup}
                onJoinGroup={() => setShowJoinGroup(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            )}

            {activeGroup && <GroupHistory key={activeGroup.id} group={activeGroup} />}
          </div>
        )}

        {/* TAB: RESUM */}
        {effectiveTab === 'stats' && (
          <div className="space-y-6">
            <StatTiles restaurants={restaurants} wishlist={visibleWishlist} />
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

      {/* Botó flotant del mòbil: afegeix el que toca a la pestanya oberta */}
      {(effectiveTab === 'restaurants' || effectiveTab === 'wishlist') && (
        <button
          onClick={() => (effectiveTab === 'wishlist' ? setShowAddWishlist(true) : setShowAddRestaurant(true))}
          aria-label={effectiveTab === 'wishlist' ? 'Proposar desitjat' : 'Afegir restaurant'}
          className={cn(
            'fixed bottom-[calc(var(--bottom-nav-h)+1rem)] right-4 sm:hidden z-40 w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform animate-scale-in',
            effectiveTab === 'wishlist' ? 'bg-violet-600 shadow-violet-600/40' : 'bg-brand shadow-accent/40',
          )}
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modals */}
      <AddRestaurantModal
        key={showAddRestaurant ? 'add-restaurant-open' : 'add-restaurant-closed'}
        isOpen={showAddRestaurant}
        onClose={() => setShowAddRestaurant(false)}
        existingNames={restaurants.map((r) => r.name)}
        onSave={async (data) => {
          const ok = await addRestaurant(data);
          if (ok) notify('Restaurant afegit');
          return ok;
        }}
      />

      <WishlistModal
        key={showAddWishlist ? 'add-wishlist-open' : 'add-wishlist-closed'}
        isOpen={showAddWishlist}
        onClose={() => setShowAddWishlist(false)}
        onSave={async (data) => {
          const ok = await addWishlistItem(data);
          if (ok) notify('Desitjat afegit');
          return ok;
        }}
      />

      <WishlistModal
        key={editingWishlist?.id ?? 'edit-wishlist'}
        isOpen={!!editingWishlist}
        item={editingWishlist}
        onClose={() => setEditingWishlist(null)}
        onSave={async (data) => {
          const ok = editingWishlist ? await updateWishlistItem(editingWishlist.id, data) : false;
          if (ok) notify('Canvis desats');
          return ok;
        }}
      />

      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={closeRestaurantDetail}
        onReroll={selectedRestaurantId !== null && selectedRestaurantId === randomPickId ? openRandomRestaurant : undefined}
        onEdit={setEditingRestaurant}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteRestaurant}
        onRegisterVisit={(r, v) => setVisitTarget({ restaurant: r, visit: v })}
        onDeleteVisit={deleteVisit}
        onCopyToGroup={(r) => {
          closeRestaurantDetail();
          setShareTarget({ mode: 'copy', type: 'restaurant', id: r.id, name: r.name });
        }}
        onMoveToGroup={isPersonal ? (r) => {
          closeRestaurantDetail();
          setShareTarget({ mode: 'move', type: 'restaurant', id: r.id, name: r.name });
        } : undefined}
      />

      <AddRestaurantModal
        key={editingRestaurant?.id ?? 'edit'}
        isOpen={!!editingRestaurant}
        restaurant={editingRestaurant}
        onClose={() => setEditingRestaurant(null)}
        onSave={async (data) => {
          const ok = editingRestaurant ? await updateRestaurant(editingRestaurant.id, data as Partial<Restaurant>) : false;
          if (ok) notify('Canvis desats');
          return ok;
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
          if (shareTarget.mode === 'move') {
            await moveToGroup(shareTarget.type, shareTarget.id, groupIds[0]);
            notify(`Mogut a «${userGroups.find((g) => g.id === groupIds[0])?.name ?? 'el grup'}»`);
          } else {
            await copyToGroups(shareTarget.type, shareTarget.id, groupIds);
            notify(groupIds.length === 1 ? 'Copiat al grup' : `Copiat a ${groupIds.length} grups`);
          }
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
        key={showProfile ? 'profile-open' : 'profile-closed'}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onOpenTour={() => {
          setShowProfile(false);
          setShowTour(true);
        }}
      />

      {showTour && <WelcomeTour onClose={() => setShowTour(false)} />}

      <VisitModal
        restaurant={visitTarget?.restaurant ?? null}
        visit={visitTarget?.visit}
        onClose={() => setVisitTarget(null)}
        onSave={async (...args: Parameters<typeof saveVisit>) => {
          const ok = await saveVisit(...args);
          if (ok) notify(args[6] ? 'Visita actualitzada' : 'Visita registrada');
          return ok;
        }}
      />

      <VisitModal
        restaurant={wishlistToConvert ? {
          id: '__convert__',
          name: wishlistToConvert.restaurantName,
          cuisine: wishlistToConvert.cuisine,
          priceRange: wishlistToConvert.priceRange,
          groupId: wishlistToConvert.groupId,
          createdBy: wishlistToConvert.userId,
          visits: [],
        } : null}
        onClose={() => setWishlistToConvert(null)}
        onSave={async (_id, visitedOn, rating, notes, attendeeIds, shared) => {
          if (!wishlistToConvert) return false;
          await convertWishlistToRestaurant(wishlistToConvert, { visitedOn, rating, notes, attendeeIds, shared });
          setWishlistToConvert(null);
          return true;
        }}
      />

      <Toast message={dataError} onClose={clearError} />
      <Toast message={dataError ? null : linkError} onClose={clearLinkError} />
      <Toast message={dataError || linkError ? null : notice?.message ?? null} action={notice?.action} variant="success" onClose={clearNotice} />

      <BottomNav
        activeTab={effectiveTab}
        onTabChange={setCurrentTab}
        isPersonal={isPersonal}
        alertCount={unreadAlertCount}
      />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
