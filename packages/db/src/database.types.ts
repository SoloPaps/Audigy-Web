export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string;
          kind: string;
          payload: NonNullable<Json>;
          sent_at: string | null;
          site_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          kind: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          site_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          kind?: string;
          payload?: NonNullable<Json>;
          sent_at?: string | null;
          site_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artifacts: {
        Row: {
          audit_id: string;
          bytes: number;
          id: string;
          kind: string;
          sha256: string;
          storage_path: string;
        };
        ComputedFields: never;
        Insert: {
          audit_id: string;
          bytes: number;
          id?: string;
          kind: string;
          sha256: string;
          storage_path: string;
        };
        Update: {
          audit_id?: string;
          bytes?: number;
          id?: string;
          kind?: string;
          sha256?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artifacts_audit_id_fkey';
            columns: ['audit_id'];
            isOneToOne: false;
            referencedRelation: 'audits';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          at: string;
          details: NonNullable<Json>;
          id: string;
          target: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor?: string | null;
          at?: string;
          details?: NonNullable<Json>;
          id?: string;
          target?: string | null;
        };
        Update: {
          action?: string;
          actor?: string | null;
          at?: string;
          details?: NonNullable<Json>;
          id?: string;
          target?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_fkey';
            columns: ['actor'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audits: {
        Row: {
          coverage: number | null;
          created_at: string;
          engine_version: string;
          error: string | null;
          finished_at: string | null;
          global_score: number | null;
          id: string;
          method_version: string;
          mode: string;
          site_id: string;
          started_at: string | null;
          status: string;
          trigger: string;
        };
        ComputedFields: never;
        Insert: {
          coverage?: number | null;
          created_at?: string;
          engine_version: string;
          error?: string | null;
          finished_at?: string | null;
          global_score?: number | null;
          id?: string;
          method_version: string;
          mode: string;
          site_id: string;
          started_at?: string | null;
          status: string;
          trigger: string;
        };
        Update: {
          coverage?: number | null;
          created_at?: string;
          engine_version?: string;
          error?: string | null;
          finished_at?: string | null;
          global_score?: number | null;
          id?: string;
          method_version?: string;
          mode?: string;
          site_id?: string;
          started_at?: string | null;
          status?: string;
          trigger?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audits_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
      domain_scores: {
        Row: {
          audit_id: string;
          coverage: number;
          domain: string;
          level: string;
          score: number | null;
        };
        ComputedFields: never;
        Insert: {
          audit_id: string;
          coverage: number;
          domain: string;
          level: string;
          score?: number | null;
        };
        Update: {
          audit_id?: string;
          coverage?: number;
          domain?: string;
          level?: string;
          score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'domain_scores_audit_id_fkey';
            columns: ['audit_id'];
            isOneToOne: false;
            referencedRelation: 'audits';
            referencedColumns: ['id'];
          },
        ];
      };
      findings: {
        Row: {
          audit_id: string;
          check_id: string;
          domain: string;
          effort_minutes: number | null;
          fix_key: string | null;
          id: string;
          impact: number;
          measured: NonNullable<Json>;
          message_key: string;
          params: NonNullable<Json>;
          score: number | null;
          severity: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          audit_id: string;
          check_id: string;
          domain: string;
          effort_minutes?: number | null;
          fix_key?: string | null;
          id?: string;
          impact: number;
          measured?: NonNullable<Json>;
          message_key: string;
          params?: NonNullable<Json>;
          score?: number | null;
          severity: number;
          status: string;
        };
        Update: {
          audit_id?: string;
          check_id?: string;
          domain?: string;
          effort_minutes?: number | null;
          fix_key?: string | null;
          id?: string;
          impact?: number;
          measured?: NonNullable<Json>;
          message_key?: string;
          params?: NonNullable<Json>;
          score?: number | null;
          severity?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'findings_audit_id_fkey';
            columns: ['audit_id'];
            isOneToOne: false;
            referencedRelation: 'audits';
            referencedColumns: ['id'];
          },
        ];
      };
      incidents: {
        Row: {
          cause: string | null;
          id: string;
          resolved_at: string | null;
          site_id: string;
          started_at: string;
        };
        ComputedFields: never;
        Insert: {
          cause?: string | null;
          id?: string;
          resolved_at?: string | null;
          site_id: string;
          started_at: string;
        };
        Update: {
          cause?: string | null;
          id?: string;
          resolved_at?: string | null;
          site_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'incidents_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
      oauth_tokens: {
        Row: {
          created_at: string;
          provider: string;
          refresh_token_enc: string;
          scope: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          provider: string;
          refresh_token_enc: string;
          scope?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          provider?: string;
          refresh_token_enc?: string;
          scope?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'oauth_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          locale: string;
          weekly_digest: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          locale?: string;
          weekly_digest?: boolean;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          locale?: string;
          weekly_digest?: boolean;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          audit_id: string;
          id: string;
          manifest_sha256: string | null;
          revoked_at: string | null;
          share_token: string;
          signature: string | null;
          tsa: string | null;
          tsa_gen_time: string | null;
          visibility: string;
        };
        ComputedFields: never;
        Insert: {
          audit_id: string;
          id?: string;
          manifest_sha256?: string | null;
          revoked_at?: string | null;
          share_token?: string;
          signature?: string | null;
          tsa?: string | null;
          tsa_gen_time?: string | null;
          visibility?: string;
        };
        Update: {
          audit_id?: string;
          id?: string;
          manifest_sha256?: string | null;
          revoked_at?: string | null;
          share_token?: string;
          signature?: string | null;
          tsa?: string | null;
          tsa_gen_time?: string | null;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_audit_id_fkey';
            columns: ['audit_id'];
            isOneToOne: false;
            referencedRelation: 'audits';
            referencedColumns: ['id'];
          },
        ];
      };
      schedules: {
        Row: {
          cadence: string;
          enabled: boolean;
          mode: string;
          next_run_at: string;
          site_id: string;
        };
        ComputedFields: never;
        Insert: {
          cadence: string;
          enabled?: boolean;
          mode?: string;
          next_run_at: string;
          site_id: string;
        };
        Update: {
          cadence?: string;
          enabled?: boolean;
          mode?: string;
          next_run_at?: string;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedules_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: true;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
      site_verifications: {
        Row: {
          evidence: NonNullable<Json>;
          id: string;
          last_checked_at: string | null;
          method: string;
          site_id: string;
          status: string;
          token: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          evidence?: NonNullable<Json>;
          id?: string;
          last_checked_at?: string | null;
          method: string;
          site_id: string;
          status: string;
          token: string;
          verified_at?: string | null;
        };
        Update: {
          evidence?: NonNullable<Json>;
          id?: string;
          last_checked_at?: string | null;
          method?: string;
          site_id?: string;
          status?: string;
          token?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'site_verifications_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
      sites: {
        Row: {
          deleted_at: string | null;
          host: string;
          hosting: string;
          id: string;
          is_public: boolean;
          label: string;
          owner_id: string;
          path_prefix: string | null;
          public_slug: string | null;
          scope: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          deleted_at?: string | null;
          host: string;
          hosting: string;
          id?: string;
          is_public?: boolean;
          label?: string;
          owner_id: string;
          path_prefix?: string | null;
          public_slug?: string | null;
          scope: string;
          url: string;
        };
        Update: {
          deleted_at?: string | null;
          host?: string;
          hosting?: string;
          id?: string;
          is_public?: boolean;
          label?: string;
          owner_id?: string;
          path_prefix?: string | null;
          public_slug?: string | null;
          scope?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sites_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      terms_acceptances: {
        Row: {
          accepted_at: string;
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          user_id: string;
          version: string;
        };
        Update: {
          accepted_at?: string;
          user_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'terms_acceptances_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      uptime_checks: {
        Row: {
          checked_at: string;
          id: string;
          ms: number | null;
          ok: boolean;
          site_id: string;
          status_code: number | null;
        };
        ComputedFields: never;
        Insert: {
          checked_at?: string;
          id?: string;
          ms?: number | null;
          ok: boolean;
          site_id: string;
          status_code?: number | null;
        };
        Update: {
          checked_at?: string;
          id?: string;
          ms?: number | null;
          ok?: boolean;
          site_id?: string;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'uptime_checks_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
      uptime_daily: {
        Row: {
          checks: number;
          day: string;
          failures: number;
          p50_ms: number | null;
          site_id: string;
        };
        ComputedFields: never;
        Insert: {
          checks: number;
          day: string;
          failures: number;
          p50_ms?: number | null;
          site_id: string;
        };
        Update: {
          checks?: number;
          day?: string;
          failures?: number;
          p50_ms?: number | null;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'uptime_daily_site_id_fkey';
            columns: ['site_id'];
            isOneToOne: false;
            referencedRelation: 'sites';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_next_audit: {
        Args: Record<PropertyKey, never>;
        Returns: {
          coverage: number | null;
          created_at: string;
          engine_version: string;
          error: string | null;
          finished_at: string | null;
          global_score: number | null;
          id: string;
          method_version: string;
          mode: string;
          site_id: string;
          started_at: string | null;
          status: string;
          trigger: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'audits';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      list_my_oauth_connections: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          provider: string;
          scope: string;
        }[];
      };
      read_report_by_share_token: {
        Args: { p_token: string };
        Returns: {
          audit_id: string;
          id: string;
          manifest_sha256: string;
          revoked_at: string;
          signature: string;
          tsa: string;
          tsa_gen_time: string;
          visibility: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
