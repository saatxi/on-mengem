export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  photoURL?: string;
  activeGroupId?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  code: string;
  ownerId: string;
  ownerName?: string;
  memberUids: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Visit {
  id: string;
  restaurantId: string;
  groupId: string | null;
  visitedOn?: string; // ISO date string, undefined = data desconeguda
  rating?: number;
  notes?: string;
  shared: boolean; // true = grupal, false = privada
  attendeeIds: string[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string; // '€' | '€€' | '€€€' | '€€€€'
  address?: string;
  rating?: number; // 0 - 5
  notes?: string;
  link?: string; // web o xarxes socials, http(s)
  instagram?: string; // nom d'usuari sense @
  groupId: string | null; // null = espai personal
  createdBy?: string; // undefined = l'autor ha esborrat el compte
  createdByName?: string;
  favorite?: boolean;
  visits: Visit[];
  createdAt?: string;
  updatedAt?: string;
}

export type WishlistStatus = 'pending' | 'planned' | 'visited';

export interface WishlistItem {
  id: string;
  restaurantName: string;
  cuisine?: string;
  priceRange?: string;
  recommendedBy?: string;
  notes?: string;
  address?: string;
  link?: string;
  instagram?: string; // nom d'usuari sense @
  groupId: string | null; // null = espai personal
  userId?: string; // undefined = l'autor ha esborrat el compte
  userName?: string;
  status?: WishlistStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  id: string;
  groupId: string;
  userId?: string;
  type: 'restaurant_added' | 'wishlist_added' | 'group_joined' | 'restaurant_reviewed';
  title: string;
  message: string;
  restaurantId?: string;
  readBy?: string[];
  createdAt?: string;
}
