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
  priceRange?: string; // una de PRICE_RANGES (utils/restaurantFields.ts)
  address?: string;
  lat?: number; // coordenades de l'adreça (vista de mapa); totes dues o cap
  lng?: number;
  rating?: number; // 0 - 5
  notes?: string;
  link?: string; // web o xarxes socials, http(s)
  instagram?: string; // nom d'usuari sense @
  groupId: string | null; // null = espai personal
  createdBy?: string; // undefined = l'autor ha esborrat el compte
  createdByName?: string;
  favorite?: boolean;
  /** Si ve d'un desitjat: quan es va convertir (ISO) i qui l'havia recomanat. Només els posa el servidor. */
  wishFulfilledAt?: string;
  recommendedBy?: string;
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
  type: 'restaurant_added' | 'wishlist_added' | 'group_joined' | 'restaurant_reviewed' | 'group_left' | 'owner_changed';
  title: string;
  message: string;
  restaurantId?: string;
  /** Desitjat o visita de l'alerta (des de la migració 0004; les anteriors no en tenen). */
  wishlistId?: string;
  visitId?: string;
  readBy?: string[];
  createdAt?: string;
}

/** Emojis de les reaccions (llista tancada per un CHECK de la BD; ordre i etiquetes a utils/reactions.ts). */
export type ReactionEmoji = '👍' | '👎' | '❤️' | '🤤' | '🙋';

/** Ítem d'un grup al qual es reacciona. */
export interface ReactionTarget {
  type: 'restaurant' | 'wishlist' | 'visit';
  id: string;
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: ReactionEmoji;
  target: ReactionTarget;
  createdAt?: string;
}

export type GroupChangeItemType = 'restaurant' | 'wishlist' | 'visit';

/** Entrada de l'historial d'un grup. Les dades són files de la BD (snake_case), tal com les desa el servidor. */
export interface GroupChange {
  id: string;
  groupId: string;
  itemType: GroupChangeItemType;
  itemId: string;
  itemName?: string;
  action: 'update' | 'delete';
  oldData: Record<string, unknown>; // update: camps canviats; delete: la fila sencera
  newData?: Record<string, unknown>; // update: camps canviats
  changedBy?: string;
  changedByName?: string;
  createdAt: string;
  restoredAt?: string; // undefined = encara no s'ha desfet
  restoredByName?: string;
}
