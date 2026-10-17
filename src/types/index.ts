export interface UserProfile {
  id: string;
  nickname: string;
  email?: string;
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

export interface Restaurant {
  id: string;
  name: string;
  cuisine?: string;
  priceRange?: string; // '€' | '€€' | '€€€' | '€€€€'
  address?: string;
  city?: string;
  phone?: string;
  rating?: number; // 0 - 5
  notes?: string;
  link?: string; // web o xarxes socials, http(s)
  instagram?: string; // nom d'usuari sense @
  groupId: string | null; // null = espai personal
  createdBy: string;
  createdByName?: string;
  visited?: boolean;
  favorite?: boolean;
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
  link?: string;
  groupId: string | null; // null = espai personal
  userId: string;
  userName?: string;
  status?: WishlistStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  id: string;
  groupId: string;
  userId: string;
  type: 'restaurant_added' | 'wishlist_added' | 'group_joined' | 'restaurant_reviewed';
  title: string;
  message: string;
  restaurantId?: string;
  readBy?: string[];
  createdAt?: string;
}
