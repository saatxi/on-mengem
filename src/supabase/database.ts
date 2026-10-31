import type { Database as GeneratedDatabase } from './database.types';

export type { Json, Tables, TablesInsert, TablesUpdate } from './database.types';

// `supabase gen types` no marca com a nullable cap argument de funció, però Postgres hi accepta NULL.
// Aquí es corregeixen els arguments que l'app envia com a NULL (data desconeguda, sense valoració).
type PublicFunctions = GeneratedDatabase['public']['Functions'];

type WithNullableArgs<F extends keyof PublicFunctions, K extends keyof PublicFunctions[F]['Args']> =
  Omit<PublicFunctions[F], 'Args'> & {
    Args: Omit<PublicFunctions[F]['Args'], K> & { [P in K]: PublicFunctions[F]['Args'][P] | null };
  };

// A reactions, group_id i user_id els posa el servidor (trigger i auth.uid()): el client només pot inserir l'ítem i
// l'emoji (privilegis per columna), encara que els tipus generats demanin group_id.
type PublicTables = GeneratedDatabase['public']['Tables'];
type ReactionsTable = Omit<PublicTables['reactions'], 'Insert'> & {
  Insert: Pick<PublicTables['reactions']['Insert'], 'restaurant_id' | 'wishlist_id' | 'visit_id' | 'emoji'>;
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions' | 'Tables'> & {
    Tables: Omit<PublicTables, 'reactions'> & { reactions: ReactionsTable };
    Functions: Omit<PublicFunctions, 'save_visit' | 'convert_wishlist_to_restaurant'> & {
      save_visit: WithNullableArgs<'save_visit', 'p_visited_on' | 'p_rating'>;
      convert_wishlist_to_restaurant: WithNullableArgs<'convert_wishlist_to_restaurant', 'p_visited_on' | 'p_rating'>;
    };
  };
};
