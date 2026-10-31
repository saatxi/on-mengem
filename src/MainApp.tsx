import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useRealtimeData } from './hooks/useRealtimeData';
import { useRestaurantFilters } from './hooks/useRestaurantFilters';
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
import { AlertsFeed } from './components/AlertsFeed';
import { BottomNav } from './components/BottomNav';
import { TabButton } from './components/TabButton';
import { RestaurantsTab } from './components/RestaurantsTab';
import { WishlistTab } from './components/WishlistTab';
import { GroupTab } from './components/GroupTab';
import { StatsTab } from './components/StatsTab';
import { Restaurant, Visit, WishlistItem } from './types';
import { VisitModal } from './components/VisitModal';
import { WelcomeTour } from './components/WelcomeTour';
import { consumeLoginTourPending } from './utils/loginTour';
import { useRestaurantLink } from './hooks/useRestaurantLink';
import { oneOf, usePersistentState } from './hooks/usePersistentState';
import { Utensils, BookmarkPlus, Users, Bell, Plus, BarChart3 } from 'lucide-react';
import { cn } from './utils/cn';

const TABS = ['restaurants', 'wishlist', 'group', 'stats', 'alerts'] as const;
type TabType = (typeof TABS)[number];

// Temps per desfer l'eliminació d'un desitjat abans d'esborrar-lo de debò (una mica més que l'avís)
const UNDO_DELETE_MS = 5000;

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
  const [shareTarget, setShareTarget] = useState<{
    mode: 'copy' | 'move';
    type: 'restaurant' | 'wishlist';
    id: string;
    name: string;
  } | null>(null);
  // Modal de visita: { restaurant, visit? (undefined = nova visita) }
  const [visitTarget, setVisitTarget] = useState<{ restaurant: Restaurant; visit?: Visit } | null>(null);
  // Modal de conversió desitjat → restaurant
  const [wishlistToConvert, setWishlistToConvert] = useState<WishlistItem | null>(null);

  const restaurantFilters = useRestaurantFilters(restaurants);
  const filteredRestaurants = restaurantFilters.filtered;

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
  const effectiveTab: TabType = isPersonal && (currentTab === 'group' || currentTab === 'alerts') ? 'restaurants' : currentTab;

  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) ?? null;

  // «On mengem avui?»: obre un restaurant a l'atzar d'entre els que es veuen amb els filtres actuals
  const openRandomRestaurant = () => {
    // En tornar a tirar no surt el mateix restaurant (si n'hi ha d'altres)
    const candidates =
      filteredRestaurants.length > 1 ? filteredRestaurants.filter((r) => r.id !== selectedRestaurantId) : filteredRestaurants;
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
          <TabButton icon={BarChart3} label="Resum" active={effectiveTab === 'stats'} onClick={() => setCurrentTab('stats')} />
          {!isPersonal && (
            <TabButton
              icon={Bell}
              label={unreadAlertCount > 0 ? `Activitat (${unreadAlertCount})` : 'Activitat'}
              active={effectiveTab === 'alerts'}
              onClick={() => setCurrentTab('alerts')}
            />
          )}
        </div>

        {effectiveTab === 'restaurants' && (
          <RestaurantsTab
            restaurants={restaurants}
            filters={restaurantFilters}
            loading={dataLoading}
            isPersonal={isPersonal}
            onAdd={() => setShowAddRestaurant(true)}
            onOpen={(r) => setSelectedRestaurantId(r.id)}
            onOpenRandom={openRandomRestaurant}
            onToggleFavorite={toggleFavorite}
            onRegisterVisit={(r) => setVisitTarget({ restaurant: r })}
            onLocate={locateRestaurants}
          />
        )}

        {effectiveTab === 'wishlist' && (
          <WishlistTab
            wishlist={visibleWishlist}
            loading={dataLoading}
            isPersonal={isPersonal}
            onAdd={() => setShowAddWishlist(true)}
            onCopy={(w) => setShareTarget({ mode: 'copy', type: 'wishlist', id: w.id, name: w.restaurantName })}
            onMove={isPersonal ? (w) => setShareTarget({ mode: 'move', type: 'wishlist', id: w.id, name: w.restaurantName }) : undefined}
            onEdit={setEditingWishlist}
            onDelete={handleDeleteWishlist}
            onTogglePlanned={(w) => updateWishlistItem(w.id, { status: w.status === 'planned' ? 'pending' : 'planned' })}
            onMarkVisited={setWishlistToConvert}
          />
        )}

        {effectiveTab === 'group' && activeGroup && (
          <GroupTab group={activeGroup} onJoinGroup={() => setShowJoinGroup(true)} onCreateGroup={() => setShowCreateGroup(true)} />
        )}

        {effectiveTab === 'stats' && (
          <StatsTab
            restaurants={restaurants}
            wishlist={visibleWishlist}
            groupName={activeGroup?.name}
            onSelectRestaurant={setSelectedRestaurantId}
            onNotice={notify}
          />
        )}

        {effectiveTab === 'alerts' && (
          <AlertsFeed
            alerts={alerts}
            restaurants={restaurants}
            onSelectRestaurant={setSelectedRestaurantId}
            markAllAlertsAsRead={markAllAlertsAsRead}
          />
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
        onMoveToGroup={
          isPersonal
            ? (r) => {
                closeRestaurantDetail();
                setShareTarget({ mode: 'move', type: 'restaurant', id: r.id, name: r.name });
              }
            : undefined
        }
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

      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />

      <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />

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
        restaurant={
          wishlistToConvert
            ? {
                id: '__convert__',
                name: wishlistToConvert.restaurantName,
                cuisine: wishlistToConvert.cuisine,
                priceRange: wishlistToConvert.priceRange,
                groupId: wishlistToConvert.groupId,
                createdBy: wishlistToConvert.userId,
                visits: [],
              }
            : null
        }
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
      <Toast
        message={dataError || linkError ? null : (notice?.message ?? null)}
        action={notice?.action}
        variant="success"
        onClose={clearNotice}
      />

      <BottomNav activeTab={effectiveTab} onTabChange={setCurrentTab} isPersonal={isPersonal} alertCount={unreadAlertCount} />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
