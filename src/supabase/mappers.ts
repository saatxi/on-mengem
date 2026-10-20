import { Alert, Group, Restaurant, UserProfile, Visit, WishlistItem } from '../types';

// Les files de Postgres són snake_case; l'app treballa en camelCase.
type Row = Record<string, any>;

const orUndef = <T,>(v: T | null | undefined) => (v ?? undefined);

export const toProfile = (r: Row): UserProfile => ({
  id: r.id,
  nickname: r.nickname,
  avatar: r.avatar,
  photoURL: orUndef(r.photo_url),
  activeGroupId: orUndef(r.active_group_id),
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

export const toGroup = (r: Row): Group => ({
  id: r.id,
  name: r.name,
  description: orUndef(r.description),
  code: r.code,
  ownerId: r.owner_id,
  ownerName: orUndef(r.owner_name),
  memberUids: (r.group_members ?? []).map((m: Row) => m.user_id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toVisit = (r: Row): Visit => ({
  id: r.id,
  restaurantId: r.restaurant_id,
  groupId: r.group_id ?? null,
  visitedOn: orUndef(r.visited_on),
  rating: r.rating == null ? undefined : Number(r.rating),
  notes: orUndef(r.notes),
  shared: r.shared ?? true,
  attendeeIds: (r.visit_attendees ?? []).map((a: Row) => a.user_id),
  createdBy: orUndef(r.created_by),
  createdByName: orUndef(r.created_by_name),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toRestaurant = (r: Row): Restaurant => ({
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
  createdBy: r.created_by,
  createdByName: orUndef(r.created_by_name),
  favorite: r.favorite,
  visits: (r.restaurant_visits ?? [])
    .map(toVisit)
    .sort((a: Visit, b: Visit) => {
      // Visites sense data al final, ordenades per created_at descendent
      if (!a.visitedOn && !b.visitedOn) return (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1;
      if (!a.visitedOn) return 1;
      if (!b.visitedOn) return -1;
      return b.visitedOn > a.visitedOn ? 1 : -1;
    }),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toWishlistItem = (r: Row): WishlistItem => ({
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
  userId: r.user_id,
  userName: orUndef(r.user_name),
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toAlert = (r: Row): Alert => ({
  id: r.id,
  groupId: r.group_id,
  userId: r.user_id,
  type: r.type,
  title: r.title,
  message: r.message,
  restaurantId: orUndef(r.restaurant_id),
  readBy: r.read_by ?? [],
  createdAt: r.created_at,
});

// camelCase (parcial) -> columnes snake_case; només inclou les claus presents.
export const restaurantToRow = (d: Partial<Restaurant>): Row => {
  const m: Record<string, string> = {
    name: 'name', cuisine: 'cuisine', priceRange: 'price_range', address: 'address',
    rating: 'rating', notes: 'notes', link: 'link',
    instagram: 'instagram', favorite: 'favorite',
  };
  return pick(d, m);
};

export const wishlistToRow = (d: Partial<WishlistItem>): Row => {
  const m: Record<string, string> = {
    restaurantName: 'restaurant_name', cuisine: 'cuisine', priceRange: 'price_range',
    recommendedBy: 'recommended_by', address: 'address', notes: 'notes', link: 'link', instagram: 'instagram',
    status: 'status',
  };
  return pick(d, m);
};

function pick(d: Row, map: Record<string, string>): Row {
  const out: Row = {};
  for (const [k, col] of Object.entries(map)) {
    if (k in d && d[k] !== undefined) out[col] = d[k];
  }
  return out;
}
