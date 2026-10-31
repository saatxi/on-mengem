
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alerts": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"message": string,"read_by": (string)[],"restaurant_id": string | null,"title": string,"type": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"message": string,"read_by"?: (string)[],"restaurant_id"?: string | null,"title": string,"type": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"message"?: string,"read_by"?: (string)[],"restaurant_id"?: string | null,"title"?: string,"type"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"group_changes": {
                  Row: {
                    "action": string,"changed_by": string | null,"changed_by_name": string | null,"created_at": string,"group_id": string,"id": string,"item_id": string,"item_name": string | null,"item_type": string,"new_data": Json | null,"old_data": NonNullable<Json>,"restored_at": string | null,"restored_by": string | null,"restored_by_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"changed_by"?: string | null,"changed_by_name"?: string | null,"created_at"?: string,"group_id": string,"id"?: string,"item_id": string,"item_name"?: string | null,"item_type": string,"new_data"?: Json | null,"old_data": NonNullable<Json>,"restored_at"?: string | null,"restored_by"?: string | null,"restored_by_name"?: string | null
                  }
                  Update: {
                    "action"?: string,"changed_by"?: string | null,"changed_by_name"?: string | null,"created_at"?: string,"group_id"?: string,"id"?: string,"item_id"?: string,"item_name"?: string | null,"item_type"?: string,"new_data"?: Json | null,"old_data"?: NonNullable<Json>,"restored_at"?: string | null,"restored_by"?: string | null,"restored_by_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_changes_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "code": string,"created_at": string,"description": string,"id": string,"name": string,"owner_id": string,"owner_name": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string,"id"?: string,"name": string,"owner_id": string,"owner_name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"owner_name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"join_attempts": {
                  Row: {
                    "attempted_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"user_id": string
                  }
                  Update: {
                    "attempted_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "active_group_id": string | null,"avatar": string,"created_at": string,"id": string,"last_login_at": string,"nickname": string,"nickname_changed_at": string | null,"photo_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active_group_id"?: string | null,"avatar"?: string,"created_at"?: string,"id": string,"last_login_at"?: string,"nickname": string,"nickname_changed_at"?: string | null,"photo_url"?: string | null
                  }
                  Update: {
                    "active_group_id"?: string | null,"avatar"?: string,"created_at"?: string,"id"?: string,"last_login_at"?: string,"nickname"?: string,"nickname_changed_at"?: string | null,"photo_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_active_group_fk"
      columns: ["active_group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurant_visits": {
                  Row: {
                    "created_at": string,"created_by": string | null,"created_by_name": string | null,"group_id": string | null,"id": string,"notes": string | null,"rating": number | null,"restaurant_id": string,"shared": boolean,"updated_at": string,"visited_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"created_by_name"?: string | null,"group_id"?: string | null,"id"?: string,"notes"?: string | null,"rating"?: number | null,"restaurant_id": string,"shared"?: boolean,"updated_at"?: string,"visited_on"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"created_by_name"?: string | null,"group_id"?: string | null,"id"?: string,"notes"?: string | null,"rating"?: number | null,"restaurant_id"?: string,"shared"?: boolean,"updated_at"?: string,"visited_on"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurant_visits_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "restaurant_visits_restaurant_id_fkey"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"restaurants": {
                  Row: {
                    "address": string | null,"created_at": string,"created_by": string | null,"created_by_name": string | null,"cuisine": string | null,"favorite": boolean,"group_id": string | null,"id": string,"instagram": string | null,"lat": number | null,"link": string | null,"lng": number | null,"name": string,"notes": string | null,"price_range": string | null,"rating": number | null,"recommended_by": string | null,"updated_at": string,"wish_fulfilled_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_by_name"?: string | null,"cuisine"?: string | null,"favorite"?: boolean,"group_id"?: string | null,"id"?: string,"instagram"?: string | null,"lat"?: number | null,"link"?: string | null,"lng"?: number | null,"name": string,"notes"?: string | null,"price_range"?: string | null,"rating"?: number | null,"recommended_by"?: string | null,"updated_at"?: string,"wish_fulfilled_at"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_by_name"?: string | null,"cuisine"?: string | null,"favorite"?: boolean,"group_id"?: string | null,"id"?: string,"instagram"?: string | null,"lat"?: number | null,"link"?: string | null,"lng"?: number | null,"name"?: string,"notes"?: string | null,"price_range"?: string | null,"rating"?: number | null,"recommended_by"?: string | null,"updated_at"?: string,"wish_fulfilled_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurants_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_attendees": {
                  Row: {
                    "user_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "user_id": string,"visit_id": string
                  }
                  Update: {
                    "user_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_attendees_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "restaurant_visits"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist": {
                  Row: {
                    "address": string | null,"created_at": string,"cuisine": string | null,"group_id": string | null,"id": string,"instagram": string | null,"link": string | null,"notes": string | null,"price_range": string | null,"recommended_by": string | null,"restaurant_name": string,"status": string,"updated_at": string,"user_id": string | null,"user_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"cuisine"?: string | null,"group_id"?: string | null,"id"?: string,"instagram"?: string | null,"link"?: string | null,"notes"?: string | null,"price_range"?: string | null,"recommended_by"?: string | null,"restaurant_name": string,"status"?: string,"updated_at"?: string,"user_id"?: string | null,"user_name"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"cuisine"?: string | null,"group_id"?: string | null,"id"?: string,"instagram"?: string | null,"link"?: string | null,"notes"?: string | null,"price_range"?: string | null,"recommended_by"?: string | null,"restaurant_name"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null,"user_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_edit_visit":
{ Args: { "p_visit_id": string }; Returns: boolean
                           },
"can_receive_topic":
{ Args: { "p_topic": string }; Returns: boolean
                           },
"change_topics":
{ Args: { "p_row": Json,"p_table": string }; Returns: string[]
                           },
"convert_wishlist_to_restaurant":
{ Args: { "p_attendees": (string)[],"p_notes": string,"p_rating": number,"p_shared"?: boolean,"p_visited_on": string,"p_wishlist_id": string }; Returns: string
                           },
"copy_to_groups":
{ Args: { "p_group_ids": (string)[],"p_id": string,"p_type": string }; Returns: number
                           },
"create_group":
{ Args: { "p_description"?: string,"p_name": string }; Returns: {
              "code": string,
"created_at": string,
"description": string,
"id": string,
"name": string,
"owner_id": string,
"owner_name": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "groups"
        isOneToOne: true
        isSetofReturn: false
      } },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"delete_visit":
{ Args: { "p_visit_id": string }; Returns: undefined
                           },
"get_my_profile":
{ Args: Record<PropertyKey, never>; Returns: {
              "active_group_id": string | null,
"avatar": string,
"created_at": string,
"id": string,
"last_login_at": string,
"nickname": string,
"nickname_changed_at": string | null,
"photo_url": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: false
        isSetofReturn: true
      } },
"history_fields":
{ Args: { "p_item_type": string }; Returns: (string)[]
                           },
"is_converting_wishlist":
{ Args: { "p_wishlist_id": string }; Returns: boolean
                           },
"is_deleting_user":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "gid": string }; Returns: boolean
                           },
"is_group_owner":
{ Args: { "gid": string }; Returns: boolean
                           },
"join_group_by_code":
{ Args: { "p_code": string }; Returns: Json
                           },
"mark_alerts_read":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"move_to_group":
{ Args: { "p_group_id": string,"p_id": string,"p_type": string }; Returns: undefined
                           },
"new_group_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"quota_limit":
{ Args: { "p_name": string }; Returns: number
                           },
"raise_quota_exceeded":
{ Args: { "p_message": string }; Returns: undefined
                           },
"record_group_change":
{ Args: { "p_action": string,"p_after"?: Json,"p_before": Json,"p_group_id": string,"p_item_id": string,"p_item_name": string,"p_item_type": string }; Returns: undefined
                           },
"regenerate_group_code":
{ Args: { "p_group_id": string }; Returns: string
                           },
"restore_group_change":
{ Args: { "p_change_id": string }; Returns: undefined
                           },
"restore_visit_snapshot":
{ Args: { "p_visit": Json }; Returns: undefined
                           },
"save_visit":
{ Args: { "p_attendees": (string)[],"p_notes": string,"p_rating": number,"p_restaurant_id": string,"p_shared"?: boolean,"p_visit_id"?: string,"p_visited_on": string }; Returns: string
                           },
"shares_group_with":
{ Args: { "uid": string }; Returns: boolean
                           },
"transfer_group_ownership":
{ Args: { "p_group_id": string,"p_new_owner": string }; Returns: undefined
                           },
"visit_snapshot":
{ Args: { "p_visit_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
