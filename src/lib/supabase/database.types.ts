import type { MachineryTypeDb } from "@/lib/types/machinery";
import type { DefectSeverity, InspectionStage, OrderStatus } from "@/lib/types/product-inspection";

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
      product_categories: {
        Row: { id: string; name: string; sort_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; sort_order?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; sort_order?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      inspection_templates: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          version: number;
          is_active: boolean;
          checklist: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          version?: number;
          is_active?: boolean;
          checklist?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          version?: number;
          is_active?: boolean;
          checklist?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inspection_templates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      inspection_orders: {
        Row: {
          id: string;
          reference: string | null;
          client_id: string | null;
          category_id: string;
          template_id: string | null;
          stage: InspectionStage;
          status: OrderStatus;
          target_date: string;
          product_name: string;
          po_number: string | null;
          order_quantity: number | null;
          factory_name: string;
          factory_address: string | null;
          factory_city: string | null;
          factory_country: string | null;
          factory_contact: string | null;
          aql_inspection_level: string;
          aql_critical: number;
          aql_major: number;
          aql_minor: number;
          notes: string | null;
          inspection_date: string | null;
          inspector_name: string | null;
          checklist_results: Json;
          inspection_result: "Pass" | "Fail" | null;
          completed_at: string | null;
          started_at: string | null;
          contractor_id: string | null;
          start_latitude: number | null;
          start_longitude: number | null;
          start_accuracy_m: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference?: string | null;
          client_id?: string | null;
          category_id: string;
          template_id?: string | null;
          stage: InspectionStage;
          status?: OrderStatus;
          target_date: string;
          product_name: string;
          po_number?: string | null;
          order_quantity?: number | null;
          factory_name: string;
          factory_address?: string | null;
          factory_city?: string | null;
          factory_country?: string | null;
          factory_contact?: string | null;
          aql_inspection_level?: string;
          aql_critical?: number;
          aql_major?: number;
          aql_minor?: number;
          notes?: string | null;
          inspection_date?: string | null;
          inspector_name?: string | null;
          checklist_results?: Json;
          inspection_result?: "Pass" | "Fail" | null;
          completed_at?: string | null;
          started_at?: string | null;
          contractor_id?: string | null;
          start_latitude?: number | null;
          start_longitude?: number | null;
          start_accuracy_m?: number | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspection_orders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "inspection_orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_orders_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      contractors: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          regions: string[];
          approved_categories: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          regions?: string[];
          approved_categories?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contractors"]["Insert"]>;
        Relationships: [];
      };
      defect_logs: {
        Row: {
          id: string;
          order_id: string;
          severity: DefectSeverity;
          description: string;
          checklist_section: string | null;
          quantity: number;
          photo_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          severity: DefectSeverity;
          description: string;
          checklist_section?: string | null;
          quantity?: number;
          photo_url?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["defect_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "defect_logs_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "inspection_orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_contractor_id: { Args: Record<string, never>; Returns: string | null };
      find_user_by_email: { Args: { p_email: string }; Returns: { id: string; full_name: string | null }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
