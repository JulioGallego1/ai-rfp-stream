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
      companies: {
        Row: {
          available_funds: number | null
          created_at: string | null
          description: string | null
          employee_count: number | null
          id: string
          industry: string | null
          name: string
          size: string | null
          technologies: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          available_funds?: number | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          technologies?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          available_funds?: number | null
          created_at?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          technologies?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_capabilities: {
        Row: {
          capability: string
          category: string
          company_id: string | null
          created_at: string | null
          id: string
          proficiency_level: string | null
        }
        Insert: {
          capability: string
          category: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
        }
        Update: {
          capability?: string
          category?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_capabilities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          match_score: number | null
          notes: string | null
          requirement_id: string | null
          rfp_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          notes?: string | null
          requirement_id?: string | null
          rfp_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          match_score?: number | null
          notes?: string | null
          requirement_id?: string | null
          rfp_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "rfp_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checks_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      past_projects: {
        Row: {
          budget: number | null
          client_name: string | null
          company_id: string | null
          completion_date: string | null
          created_at: string | null
          description: string | null
          id: string
          outcome: string | null
          project_name: string
          technologies_used: string[] | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          client_name?: string | null
          company_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          project_name: string
          technologies_used?: string[] | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          client_name?: string | null
          company_id?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          project_name?: string
          technologies_used?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "past_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_requirements: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_mandatory: boolean | null
          priority: string | null
          requirement_text: string
          rfp_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          priority?: string | null
          requirement_text: string
          rfp_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          priority?: string | null
          requirement_text?: string
          rfp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_requirements_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_responses: {
        Row: {
          company_id: string | null
          created_at: string | null
          draft_content: string | null
          final_content: string | null
          id: string
          rfp_id: string | null
          section_title: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          draft_content?: string | null
          final_content?: string | null
          id?: string
          rfp_id?: string | null
          section_title: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          draft_content?: string | null
          final_content?: string | null
          id?: string
          rfp_id?: string | null
          section_title?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfp_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_responses_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "rfps"
            referencedColumns: ["id"]
          },
        ]
      }
      rfps: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          client_name: string | null
          compatibility_score: number | null
          created_at: string | null
          currency: string | null
          deadline: string | null
          description: string | null
          document_url: string | null
          extracted_data: Json | null
          id: string
          required_technologies: string[] | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          client_name?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string | null
          document_url?: string | null
          extracted_data?: Json | null
          id?: string
          required_technologies?: string[] | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          client_name?: string | null
          compatibility_score?: number | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string | null
          document_url?: string | null
          extracted_data?: Json | null
          id?: string
          required_technologies?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string | null
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
