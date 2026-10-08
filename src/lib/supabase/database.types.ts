import type { MachineryTypeDb } from "@/lib/types/machinery";

export type MachineryType = MachineryTypeDb;
export type InspectionOutcome = "Pass" | "Fail" | "Monitor" | "Compliant" | "Defect";
export type CertificateStatus = "Pass" | "Fail" | "Monitor" | "Unknown";
export type CertificateMachineryType = MachineryType | "Unknown";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
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
          description: string | null;
          manufacture_date: string | null;
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
          description?: string | null;
          manufacture_date?: string | null;
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
          description?: string | null;
          manufacture_date?: string | null;
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
          reason_for_exam: string | null;
          examiner_name: string | null;
          examiner_qualifications: string | null;
          examiner_employer: string | null;
          defects: string | null;
          defect_remedy_by: string | null;
          test_details: string | null;
          next_examination_due: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          inspection_date: string;
          outcome: InspectionOutcome;
          reference?: string | null;
          examiner_notes?: string | null;
          reason_for_exam?: string | null;
          examiner_name?: string | null;
          examiner_qualifications?: string | null;
          examiner_employer?: string | null;
          defects?: string | null;
          defect_remedy_by?: string | null;
          test_details?: string | null;
          next_examination_due?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          inspection_date?: string;
          outcome?: InspectionOutcome;
          reference?: string | null;
          examiner_notes?: string | null;
          reason_for_exam?: string | null;
          examiner_name?: string | null;
          examiner_qualifications?: string | null;
          examiner_employer?: string | null;
          defects?: string | null;
          defect_remedy_by?: string | null;
          test_details?: string | null;
          next_examination_due?: string | null;
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
      certificates: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string | null;
          created_at: string;
          asset_name: string;
          serial_or_model_number: string;
          inspection_date: string | null;
          expiry_date: string | null;
          inspector_or_company: string;
          status: CertificateStatus;
          client_name: string;
          site_location: string;
          machinery_type: CertificateMachineryType;
          certificate_reference: string;
          examiner_notes: string;
          file_path: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id?: string | null;
          created_at?: string;
          asset_name?: string;
          serial_or_model_number?: string;
          inspection_date?: string | null;
          expiry_date?: string | null;
          inspector_or_company?: string;
          status?: CertificateStatus;
          client_name?: string;
          site_location?: string;
          machinery_type?: CertificateMachineryType;
          certificate_reference?: string;
          examiner_notes?: string;
          file_path?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_id?: string | null;
          created_at?: string;
          asset_name?: string;
          serial_or_model_number?: string;
          inspection_date?: string | null;
          expiry_date?: string | null;
          inspector_or_company?: string;
          status?: CertificateStatus;
          client_name?: string;
          site_location?: string;
          machinery_type?: CertificateMachineryType;
          certificate_reference?: string;
          examiner_notes?: string;
          file_path?: string | null;
        };
        Relationships: [];
      };
      pre_use_checks: {
        Row: {
          id: string;
          asset_id: string;
          checked_on: string;
          checked_by: string;
          result: "OK" | "Fault";
          items: Json;
          fault_notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          checked_on: string;
          checked_by: string;
          result: "OK" | "Fault";
          items?: Json;
          fault_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          checked_on?: string;
          checked_by?: string;
          result?: "OK" | "Fault";
          items?: Json;
          fault_notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pre_use_checks_asset_id_fkey";
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
