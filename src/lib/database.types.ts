
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
            "achievements": {
                  Row: {
                    "badge": string,"earned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge": string,"earned_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge"?: string,"earned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bookings": {
                  Row: {
                    "checked_in_at": string | null,"counted_at": string | null,"created_at": string,"date": string,"id": string,"seat_id": string,"slot": Database["public"]['Enums']["slot"],"status": Database["public"]['Enums']["booking_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_in_at"?: string | null,"counted_at"?: string | null,"created_at"?: string,"date": string,"id"?: string,"seat_id": string,"slot": Database["public"]['Enums']["slot"],"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "checked_in_at"?: string | null,"counted_at"?: string | null,"created_at"?: string,"date"?: string,"id"?: string,"seat_id"?: string,"slot"?: Database["public"]['Enums']["slot"],"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_seat_id_fkey"
      columns: ["seat_id"]
isOneToOne: false
      referencedRelation: "seats"
      referencedColumns: ["id"]
    }
                  ]
                },"directory": {
                  Row: {
                    "created_at": string,"display_name": string,"email": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"email": string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"floors": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"office_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"office_id": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"office_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "floors_office_id_fkey"
      columns: ["office_id"]
isOneToOne: false
      referencedRelation: "offices"
      referencedColumns: ["id"]
    }
                  ]
                },"lunch_plans": {
                  Row: {
                    "date": string,"lunch": Database["public"]['Enums']["lunch"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "date": string,"lunch": Database["public"]['Enums']["lunch"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "date"?: string,"lunch"?: Database["public"]['Enums']["lunch"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"offices": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string,"email": string,"notify_monday": boolean,"notify_tomorrow": boolean,"role": Database["public"]['Enums']["user_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name": string,"email": string,"notify_monday"?: boolean,"notify_tomorrow"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"user_id": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"email"?: string,"notify_monday"?: boolean,"notify_tomorrow"?: boolean,"role"?: Database["public"]['Enums']["user_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_log": {
                  Row: {
                    "key": string,"kind": string,"sent_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"kind": string,"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "key"?: string,"kind"?: string,"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"seat_releases": {
                  Row: {
                    "created_at": string,"created_by": string,"date": string,"id": string,"seat_id": string,"slot": Database["public"]['Enums']["slot"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"date": string,"id"?: string,"seat_id": string,"slot": Database["public"]['Enums']["slot"]
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"date"?: string,"id"?: string,"seat_id"?: string,"slot"?: Database["public"]['Enums']["slot"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "seat_releases_seat_id_fkey"
      columns: ["seat_id"]
isOneToOne: false
      referencedRelation: "seats"
      referencedColumns: ["id"]
    }
                  ]
                },"seats": {
                  Row: {
                    "active": boolean,"code": string,"created_at": string,"floor_id": string,"id": string,"owner_emails": (string)[],"owner_id": string | null,"owner_name": string | null,"sort_order": number,"zone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"code": string,"created_at"?: string,"floor_id": string,"id"?: string,"owner_emails"?: (string)[],"owner_id"?: string | null,"owner_name"?: string | null,"sort_order"?: number,"zone"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"created_at"?: string,"floor_id"?: string,"id"?: string,"owner_emails"?: (string)[],"owner_id"?: string | null,"owner_name"?: string | null,"sort_order"?: number,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "seats_floor_id_fkey"
      columns: ["floor_id"]
isOneToOne: false
      referencedRelation: "floors"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "allowed_email_domains": (string)[],"am_start": string,"booking_retention_days": number,"id": boolean,"max_days_per_week": number | null,"pm_start": string,"push_evening_hour": number,"push_function_url": string | null,"push_monday_hour": number,"timezone": string,"updated_at": string,"working_days": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_email_domains"?: (string)[],"am_start"?: string,"booking_retention_days"?: number,"id"?: boolean,"max_days_per_week"?: number | null,"pm_start"?: string,"push_evening_hour"?: number,"push_function_url"?: string | null,"push_monday_hour"?: number,"timezone"?: string,"updated_at"?: string,"working_days"?: (number)[]
                  }
                  Update: {
                    "allowed_email_domains"?: (string)[],"am_start"?: string,"booking_retention_days"?: number,"id"?: boolean,"max_days_per_week"?: number | null,"pm_start"?: string,"push_evening_hour"?: number,"push_function_url"?: string | null,"push_monday_hour"?: number,"timezone"?: string,"updated_at"?: string,"working_days"?: (number)[]
                  }
                  Relationships: [
                    
                  ]
                },"user_stats": {
                  Row: {
                    "best_streak": number,"current_streak": number,"last_office_day": string | null,"office_days": number,"seats_used": (string)[],"updated_at": string,"user_id": string,"week_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "best_streak"?: number,"current_streak"?: number,"last_office_day"?: string | null,"office_days"?: number,"seats_used"?: (string)[],"updated_at"?: string,"user_id": string,"week_days"?: number
                  }
                  Update: {
                    "best_streak"?: number,"current_streak"?: number,"last_office_day"?: string | null,"office_days"?: number,"seats_used"?: (string)[],"updated_at"?: string,"user_id"?: string,"week_days"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_set_role":
{ Args: { "p_role": string,"p_user_id": string }; Returns: undefined
                           },
"bmd_assert_window":
{ Args: { "p_date": string,"p_settings": Omit<Database["public"]['Tables']["settings"]['Row'], Database["public"]['Tables']["settings"]['ComputedFields']>,"p_today": string }; Returns: undefined
                           },
"bmd_award":
{ Args: { "p_badge": string,"p_user": string }; Returns: (string)[]
                           },
"bmd_candidates_json":
{ Args: { "p_rows": unknown }; Returns: Json
                           },
"bmd_count_office_day":
{ Args: { "p_booking_id": string }; Returns: (string)[]
                           },
"bmd_local_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"bmd_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"bmd_parse_slots":
{ Args: { "p_slot": string }; Returns: (Database["public"]['Enums']["slot"])[]
                           },
"bmd_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"book_seat":
{ Args: { "p_date": string,"p_seat_id": string,"p_slot": string }; Returns: {
              "checked_in_at": string | null,
"counted_at": string | null,
"created_at": string,
"date": string,
"id": string,
"seat_id": string,
"slot": Database["public"]['Enums']["slot"],
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: false
        isSetofReturn: true
      } },
"cancel_booking":
{ Args: { "p_booking_id": string }; Returns: {
              "checked_in_at": string | null,
"counted_at": string | null,
"created_at": string,
"date": string,
"id": string,
"seat_id": string,
"slot": Database["public"]['Enums']["slot"],
"status": Database["public"]['Enums']["booking_status"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"count_office_days":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"display_name_from_email":
{ Args: { "p_email": string }; Returns: string
                           },
"get_allowed_email_domains":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"ping":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"purge_old_bookings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"push_monday_candidates":
{ Args: { "p_today": string }; Returns: {
              "body": string,"key": string,"tag": string,"title": string,"url": string,"user_id": string
            }[]
                           },
"push_scheduled":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"push_send":
{ Args: { "p_messages": Json }; Returns: number
                           },
"push_tomorrow_candidates":
{ Args: { "p_today": string }; Returns: {
              "body": string,"key": string,"tag": string,"title": string,"url": string,"user_id": string
            }[]
                           },
"release_my_seat":
{ Args: { "p_date": string,"p_seat_id": string,"p_slot": string }; Returns: undefined
                           },
"team_roster":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string,"display_name": string,"user_ids": (string)[]
            }[]
                           },
"unrelease_my_seat":
{ Args: { "p_date": string,"p_seat_id": string,"p_slot": string }; Returns: undefined
                           }
          }
          Enums: {
            "booking_status": "booked"|"checked_in"|"released"|"cancelled","lunch": "box"|"out","slot": "AM"|"PM","user_role": "user"|"admin"
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
            "booking_status": ["booked", "checked_in", "released", "cancelled"],"lunch": ["box", "out"],"slot": ["AM", "PM"],"user_role": ["user", "admin"]
          }
        }
} as const
