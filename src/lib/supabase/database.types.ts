
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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      body_logs: {
        Row: {
          calories: number | null
          log_date: string
          note: string | null
          updated_at: string
          user_id: string
          weight_lb: number
        }
        Insert: {
          calories?: number | null
          log_date: string
          note?: string | null
          updated_at?: string
          user_id: string
          weight_lb: number
        }
        Update: {
          calories?: number | null
          log_date?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          weight_lb?: number
        }
        Relationships: []
      }
      program_days: {
        Row: {
          day_number: number
          id: string
          label: string
          program_id: string
          title: string
        }
        Insert: {
          day_number: number
          id?: string
          label: string
          program_id: string
          title: string
        }
        Update: {
          day_number?: number
          id?: string
          label?: string
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          archived_at: string | null
          base_reps: number | null
          id: string
          image_url: string | null
          increment: number
          name: string
          note: string | null
          order_index: number
          program_day_id: string
          sets: number
          start_weight: number | null
          tracked: boolean
        }
        Insert: {
          archived_at?: string | null
          base_reps?: number | null
          id?: string
          image_url?: string | null
          increment?: number
          name: string
          note?: string | null
          order_index: number
          program_day_id: string
          sets: number
          start_weight?: number | null
          tracked?: boolean
        }
        Update: {
          archived_at?: string | null
          base_reps?: number | null
          id?: string
          image_url?: string | null
          increment?: number
          name?: string
          note?: string | null
          order_index?: number
          program_day_id?: string
          sets?: number
          start_weight?: number | null
          tracked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          deload_weeks: number[]
          id: string
          name: string
          user_id: string
          weeks: number
        }
        Insert: {
          created_at?: string
          deload_weeks?: number[]
          id?: string
          name: string
          user_id: string
          weeks: number
        }
        Update: {
          created_at?: string
          deload_weeks?: number[]
          id?: string
          name?: string
          user_id?: string
          weeks?: number
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          actual_reps: number | null
          actual_weight: number | null
          completed: boolean
          id: string
          logged_at: string
          planned_reps: number | null
          planned_weight: number | null
          program_exercise_id: string
          session_id: string
          set_number: number
        }
        Insert: {
          actual_reps?: number | null
          actual_weight?: number | null
          completed?: boolean
          id?: string
          logged_at?: string
          planned_reps?: number | null
          planned_weight?: number | null
          program_exercise_id: string
          session_id: string
          set_number: number
        }
        Update: {
          actual_reps?: number | null
          actual_weight?: number | null
          completed?: boolean
          id?: string
          logged_at?: string
          planned_reps?: number | null
          planned_weight?: number | null
          program_exercise_id?: string
          session_id?: string
          set_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_photos: {
        Row: {
          created_at: string
          id: string
          session_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          program_day_id: string
          started_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          program_day_id: string
          started_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          program_day_id?: string
          started_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
