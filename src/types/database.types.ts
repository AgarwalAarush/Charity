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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          match_id: string
          responded_at: string | null
          roster_member_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          match_id: string
          responded_at?: string | null
          roster_member_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          match_id?: string
          responded_at?: string | null
          roster_member_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_roster_member_id_fkey"
            columns: ["roster_member_id"]
            isOneToOne: false
            referencedRelation: "roster_members"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          items: Json | null
          name: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          items?: Json | null
          name: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          items?: Json | null
          name?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          dm_user1: string | null
          dm_user2: string | null
          id: string
          kind: string
          last_message_at: string | null
          last_message_preview: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dm_user1?: string | null
          dm_user2?: string | null
          id?: string
          kind: string
          last_message_at?: string | null
          last_message_preview?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dm_user1?: string | null
          dm_user2?: string | null
          id?: string
          kind?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_dm_user1_fkey"
            columns: ["dm_user1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_dm_user2_fkey"
            columns: ["dm_user2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      court_reservations: {
        Row: {
          court_number: string | null
          created_at: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          updated_at: string | null
          user_id: string
          venue_name: string
        }
        Insert: {
          court_number?: string | null
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          updated_at?: string | null
          user_id: string
          venue_name: string
        }
        Update: {
          court_number?: string | null
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string
          created_at: string | null
          error_message: string | null
          id: string
          match_id: string | null
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string | null
          subject: string
          team_id: string | null
          type: string
        }
        Insert: {
          body: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          match_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          team_id?: string | null
          type: string
        }
        Update: {
          body?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          match_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          combined_rating: number | null
          court_slot: number
          created_at: string | null
          id: string
          is_published: boolean | null
          match_id: string
          player1_id: string | null
          player2_id: string | null
          updated_at: string | null
        }
        Insert: {
          combined_rating?: number | null
          court_slot: number
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          match_id: string
          player1_id?: string | null
          player2_id?: string | null
          updated_at?: string | null
        }
        Update: {
          combined_rating?: number | null
          court_slot?: number
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          match_id?: string
          player1_id?: string | null
          player2_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "roster_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "roster_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scores: {
        Row: {
          away_games: number | null
          created_at: string | null
          home_games: number | null
          id: string
          is_completed: boolean | null
          lineup_id: string
          set_number: number
          tiebreak_away: number | null
          tiebreak_home: number | null
          updated_at: string | null
        }
        Insert: {
          away_games?: number | null
          created_at?: string | null
          home_games?: number | null
          id?: string
          is_completed?: boolean | null
          lineup_id: string
          set_number: number
          tiebreak_away?: number | null
          tiebreak_home?: number | null
          updated_at?: string | null
        }
        Update: {
          away_games?: number | null
          created_at?: string | null
          home_games?: number | null
          id?: string
          is_completed?: boolean | null
          lineup_id?: string
          set_number?: number
          tiebreak_away?: number | null
          tiebreak_home?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "lineups"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          checklist_status: Json | null
          created_at: string | null
          date: string
          id: string
          is_home: boolean | null
          match_result: string | null
          notes: string | null
          opponent_captain_email: string | null
          opponent_captain_name: string | null
          opponent_captain_phone: string | null
          opponent_name: string
          score_summary: string | null
          team_id: string
          time: string
          updated_at: string | null
          venue: string | null
          venue_address: string | null
          warm_up_court: string | null
          warm_up_status: string | null
          warm_up_time: string | null
        }
        Insert: {
          checklist_status?: Json | null
          created_at?: string | null
          date: string
          id?: string
          is_home?: boolean | null
          match_result?: string | null
          notes?: string | null
          opponent_captain_email?: string | null
          opponent_captain_name?: string | null
          opponent_captain_phone?: string | null
          opponent_name: string
          score_summary?: string | null
          team_id: string
          time: string
          updated_at?: string | null
          venue?: string | null
          venue_address?: string | null
          warm_up_court?: string | null
          warm_up_status?: string | null
          warm_up_time?: string | null
        }
        Update: {
          checklist_status?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          is_home?: boolean | null
          match_result?: string | null
          notes?: string | null
          opponent_captain_email?: string | null
          opponent_captain_name?: string | null
          opponent_captain_phone?: string | null
          opponent_name?: string
          score_summary?: string | null
          team_id?: string
          time?: string
          updated_at?: string | null
          venue?: string | null
          venue_address?: string | null
          warm_up_court?: string | null
          warm_up_status?: string | null
          warm_up_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opponents_db: {
        Row: {
          created_at: string | null
          games_percentage: number | null
          id: string
          notes: string | null
          ntrp: number | null
          player_name: string
          tags: string[] | null
          team_id: string
          updated_at: string | null
          win_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          games_percentage?: number | null
          id?: string
          notes?: string | null
          ntrp?: number | null
          player_name: string
          tags?: string[] | null
          team_id: string
          updated_at?: string | null
          win_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          games_percentage?: number | null
          id?: string
          notes?: string | null
          ntrp?: number | null
          player_name?: string
          tags?: string[] | null
          team_id?: string
          updated_at?: string | null
          win_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opponents_db_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pair_statistics: {
        Row: {
          created_at: string | null
          id: string
          matches_together: number | null
          player1_id: string
          player2_id: string
          team_id: string
          total_games_played: number | null
          total_games_won: number | null
          updated_at: string | null
          wins: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          matches_together?: number | null
          player1_id: string
          player2_id: string
          team_id: string
          total_games_played?: number | null
          total_games_won?: number | null
          updated_at?: string | null
          wins?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          matches_together?: number | null
          player1_id?: string
          player2_id?: string
          team_id?: string
          total_games_played?: number | null
          total_games_won?: number | null
          updated_at?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pair_statistics_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "roster_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_statistics_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "roster_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pair_statistics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_defaults: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          ntrp_rating: number | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          availability_defaults?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          ntrp_rating?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          availability_defaults?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          ntrp_rating?: number | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roster_members: {
        Row: {
          availability_defaults: Json | null
          created_at: string | null
          email: string | null
          fair_play_score: number | null
          full_name: string
          id: string
          is_active: boolean | null
          matches_played: number | null
          ntrp_rating: number | null
          phone: string | null
          role: string | null
          team_id: string
          updated_at: string | null
          user_id: string | null
          wins: number | null
        }
        Insert: {
          availability_defaults?: Json | null
          created_at?: string | null
          email?: string | null
          fair_play_score?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          matches_played?: number | null
          ntrp_rating?: number | null
          phone?: string | null
          role?: string | null
          team_id: string
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Update: {
          availability_defaults?: Json | null
          created_at?: string | null
          email?: string | null
          fair_play_score?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          matches_played?: number | null
          ntrp_rating?: number | null
          phone?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string | null
          user_id?: string | null
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roster_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          id: string
          invitee_email: string
          invitee_id: string
          inviter_id: string
          message: string | null
          responded_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_email: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_email?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          co_captain_id: string | null
          created_at: string | null
          fee_per_team: number | null
          home_phones: string | null
          id: string
          league_format: string | null
          name: string
          rating_limit: number | null
          season: string | null
          updated_at: string | null
          venue_address: string | null
          warmup_policy: string | null
          welcome_template_id: string | null
        }
        Insert: {
          captain_id?: string | null
          co_captain_id?: string | null
          created_at?: string | null
          fee_per_team?: number | null
          home_phones?: string | null
          id?: string
          league_format?: string | null
          name: string
          rating_limit?: number | null
          season?: string | null
          updated_at?: string | null
          venue_address?: string | null
          warmup_policy?: string | null
          welcome_template_id?: string | null
        }
        Update: {
          captain_id?: string | null
          co_captain_id?: string | null
          created_at?: string | null
          fee_per_team?: number | null
          home_phones?: string | null
          id?: string
          league_format?: string | null
          name?: string
          rating_limit?: number | null
          season?: string | null
          updated_at?: string | null
          venue_address?: string | null
          warmup_policy?: string | null
          welcome_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_co_captain_id_fkey"
            columns: ["co_captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_captain: { Args: { _team_id: string }; Returns: boolean }
      is_team_member: { Args: { _team_id: string }; Returns: boolean }
      shares_team_with: { Args: { _other_user_id: string }; Returns: boolean }
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
