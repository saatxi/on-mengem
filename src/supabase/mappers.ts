import { Alert, Group, GroupChange, GroupChangeItemType, Restaurant, UserProfile, Visit, WishlistItem, WishlistStatus } from '../types';
import type { Json, Tables, TablesUpdate } from './database';

// Les files de Postgres són snake_case; l'app treballa en camelCase.
// Les relacions incrustades (select('*, group_members(user_id)'), etc.) són opcionals per a les files de Realtime.
type GroupRow = Tables<'groups'> & { group_members?: Pick<Tables<'group_members'>, 'user_id'>[] };
type VisitRow = Tables<'restaurant_visits'> & { visit_attendees?: Pick<Tables<'visit_attendees'>, 'user_id'>[] };
type RestaurantRow = Tables<'restaurants'> & { restaurant_visits?: VisitRow[] };

const orUndef = <T,>(v: T | null | undefined) => (v ?? undefined);

export const toProfile = (r: Tables<'profiles'>): UserProfile => ({
  id: r.id,
  nickname: r.nickname,
  avatar: r.avatar,
  photoURL: orUndef(r.photo_url),
  activeGroupId: orUndef(r.active_group_id),
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

export const toGroup = (r: GroupRow): Group => ({
  id: r.id,
  name: r.name,
  description: orUndef(r.description),
  code: r.code,
  ownerId: r.owner_id,
  ownerName: orUndef(r.owner_name),
  memberUids: (r.group_members ?? []).map((m) => m.user_id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toVisit = (r: VisitRow): Visit => ({
  id: r.id,
  restaurantId: r.restaurant_id,
  groupId: r.group_id ?? null,
  visitedOn: orUndef(r.visited_on),
  rating: r.rating == null ? undefined : Number(r.rating),
  notes: orUndef(r.notes),
  shared: r.shared ?? true,
  attendeeIds: (r.visit_attendees ?? []).map((a) => a.user_id),
  createdBy: orUndef(r.created_by),
  createdByName: orUndef(r.created_by_name),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toRestaurant = (r: RestaurantRow): Restaurant => ({
  id: r.id,
  name: r.name,
  cuisine: orUndef(r.cuisine),
  priceRange: orUndef(r.price_range),
  address: orUndef(r.address),
  rating: r.rating == null ? undefined : Number(r.rating),
  notes: orUndef(r.notes),
  link: orUndef(r.link),
  instagram: orUndef(r.instagram),
  groupId: r.group_id ?? null,
  createdBy: orUndef(r.created_by),
  createdByName: orUndef(r.created_by_name),
  favorite: r.favorite,
  visits: (r.restaurant_visits ?? [])
    .map(toVisit)
    .sort((a, b) => {
      // Visites sense data al final, ordenades per created_at descendent
      if (!a.visitedOn && !b.visitedOn) return (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1;
      if (!a.visitedOn) return 1;
      if (!b.visitedOn) return -1;
      return b.visitedOn > a.visitedOn ? 1 : -1;
    }),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toWishlistItem = (r: Tables<'wishlist'>): WishlistItem => ({
  id: r.id,
  restaurantName: r.restaurant_name,
  cuisine: orUndef(r.cuisine),
  priceRange: orUndef(r.price_range),
  recommendedBy: orUndef(r.recommended_by),
  address: orUndef(r.address),
  notes: orUndef(r.notes),
  link: orUndef(r.link),
  instagram: orUndef(r.instagram),
  groupId: r.group_id ?? null,
  userId: orUndef(r.user_id),
  userName: orUndef(r.user_name),
  // La BD ho restringeix amb un CHECK, però els tipus generats només en veuen el text.
  status: r.status as WishlistStatus,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toAlert = (r: Tables<'alerts'>): Alert => ({
  id: r.id,
  groupId: r.group_id,
  userId: orUndef(r.user_id),
  // Com status: llista tancada per un CHECK de la BD.
  type: r.type as Alert['type'],
  title: r.title,
  message: r.message,
  restaurantId: orUndef(r.restaurant_id),
  readBy: r.read_by ?? [],
  createdAt: r.created_at,
});

const asObject = (v: Json | null): Record<string, unknown> | undefined =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v : undefined;

export const toGroupChange = (r: Tables<'group_changes'>): GroupChange => ({
  id: r.id,
  groupId: r.group_id,
  // Com status: llistes tancades per CHECK de la BD.
  itemType: r.item_type as GroupChangeItemType,
  itemId: r.item_id,
  itemName: orUndef(r.item_name),
  action: r.action as GroupChange['action'],
  oldData: asObject(r.old_data) ?? {},
  newData: asObject(r.new_data),
  changedBy: orUndef(r.changed_by),
  changedByName: orUndef(r.changed_by_name),
  createdAt: r.created_at,
  restoredAt: orUndef(r.restored_at),
  restoredByName: orUndef(r.restored_by_name),
});

// camelCase (parcial) -> columnes snake_case. Les claus undefined no s'envien (JSON.stringify les omet).
export const restaurantToRow = (d: Partial<Restaurant>): TablesUpdate<'restaurants'> => ({
  name: d.name,
  cuisine: d.cuisine,
  price_range: d.priceRange,
  address: d.address,
  rating: d.rating,
  notes: d.notes,
  link: d.link,
  instagram: d.instagram,
  favorite: d.favorite,
});

export const wishlistToRow = (d: Partial<WishlistItem>): TablesUpdate<'wishlist'> => ({
  restaurant_name: d.restaurantName,
  cuisine: d.cuisine,
  price_range: d.priceRange,
  recommended_by: d.recommendedBy,
  address: d.address,
  notes: d.notes,
  link: d.link,
  instagram: d.instagram,
  status: d.status,
});
