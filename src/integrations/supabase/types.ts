export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          inferred_trackables: Json | null
          logged_at: string
          parsed_data: Json | null
          raw_input: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          inferred_trackables?: Json | null
          logged_at?: string
          parsed_data?: Json | null
          raw_input?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          inferred_trackables?: Json | null
          logged_at?: string
          parsed_data?: Json | null
          raw_input?: string | null
        }
        Relationships: []
      }
      decision_impacts: {
        Row: {
          created_at: string
          event_id: string
          goal_rule_id: string
          id: string
          impact_details: Json | null
          impact_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          goal_rule_id: string
          id?: string
          impact_details?: Json | null
          impact_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          goal_rule_id?: string
          id?: string
          impact_details?: Json | null
          impact_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_impacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "normalized_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_impacts_goal_rule_id_fkey"
            columns: ["goal_rule_id"]
            isOneToOne: false
            referencedRelation: "goal_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_evaluations: {
        Row: {
          completions_in_window: number
          confidence: number | null
          details: Json | null
          evaluated_at: string
          goal_rule_id: string
          id: string
          last_fail_at: string | null
          last_fail_reason: string | null
          last_success_at: string | null
          pending_windows: Json | null
          required_in_window: number
          status: string
        }
        Insert: {
          completions_in_window?: number
          confidence?: number | null
          details?: Json | null
          evaluated_at?: string
          goal_rule_id: string
          id?: string
          last_fail_at?: string | null
          last_fail_reason?: string | null
          last_success_at?: string | null
          pending_windows?: Json | null
          required_in_window?: number
          status: string
        }
        Update: {
          completions_in_window?: number
          confidence?: number | null
          details?: Json | null
          evaluated_at?: string
          goal_rule_id?: string
          id?: string
          last_fail_at?: string | null
          last_fail_reason?: string | null
          last_success_at?: string | null
          pending_windows?: Json | null
          required_in_window?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_evaluations_goal_rule_id_fkey"
            columns: ["goal_rule_id"]
            isOneToOne: false
            referencedRelation: "goal_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number | null
          required_completions: number | null
          rolling_window_days: number | null
          rule_config: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          required_completions?: number | null
          rolling_window_days?: number | null
          rule_config: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          required_completions?: number | null
          rolling_window_days?: number | null
          rule_config?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      normalized_events: {
        Row: {
          confidence: number | null
          created_at: string
          event_name: string
          event_type: string
          id: string
          magnitude: number | null
          metadata: Json | null
          occurred_at: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          event_name: string
          event_type: string
          id?: string
          magnitude?: number | null
          metadata?: Json | null
          occurred_at: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          event_name?: string
          event_type?: string
          id?: string
          magnitude?: number | null
          metadata?: Json | null
          occurred_at?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: []
      }
      trackable_values: {
        Row: {
          id: string
          logged_at: string
          notes: string | null
          source: string | null
          source_activity_id: string | null
          trackable_id: string
          value: number
        }
        Insert: {
          id?: string
          logged_at?: string
          notes?: string | null
          source?: string | null
          source_activity_id?: string | null
          trackable_id: string
          value: number
        }
        Update: {
          id?: string
          logged_at?: string
          notes?: string | null
          source?: string | null
          source_activity_id?: string | null
          trackable_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "trackable_values_trackable_id_fkey"
            columns: ["trackable_id"]
            isOneToOne: false
            referencedRelation: "trackables"
            referencedColumns: ["id"]
          },
        ]
      }
      trackables: {
        Row: {
          category: string | null
          created_at: string
          daily_target: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          daily_target?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          daily_target?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          unit?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
