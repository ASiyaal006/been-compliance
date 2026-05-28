export type MachineryType = "LOLER" | "PSSR" | "COSHH" | "Other";
export type InspectionOutcome = "Pass" | "Fail" | "Monitor" | "Compliant" | "Defect";

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          client_id: string;
          asset_id_serial: string;
          machinery_type: MachineryType;
          site_location: string;
          commissioning_date: string;
          next_inspection_due: string | null;
          swl: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          asset_id_serial: string;
          machinery_type: MachineryType;
          site_location: string;
          commissioning_date: string;
          next_inspection_due?: string | null;
          swl?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          asset_id_serial?: string;
          machinery_type?: MachineryType;
          site_location?: string;
          commissioning_date?: string;
          next_inspection_due?: string | null;
          swl?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          client_id: string | null;
          is_been_admin: boolean;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          client_id?: string | null;
          is_been_admin?: boolean;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          is_been_admin?: boolean;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      inspections: {
        Row: {
          id: string;
          asset_id: string;
          inspection_date: string;
          outcome: InspectionOutcome;
          reference: string | null;
          examiner_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          inspection_date: string;
          outcome: InspectionOutcome;
          reference?: string | null;
          examiner_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          inspection_date?: string;
          outcome?: InspectionOutcome;
          reference?: string | null;
          examiner_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
