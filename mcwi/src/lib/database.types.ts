/**
 * Supabase Database Type Definitions
 * Auto-generated types for PostgreSQL schema
 * 
 * These types match the shared-contracts/protobuf schemas
 * per SPEC-KIT Article III: Contract Supremacy
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ships: {
        Row: {
          id: string;
          ship_name: string;
          phase: number;
          overall_health: number;
          last_telemetry_ms: number;
          current_objective: string;
          ai_confidence: number;
          position_x: number | null;
          position_y: number | null;
          position_z: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ship_name: string;
          phase?: number;
          overall_health?: number;
          last_telemetry_ms?: number;
          current_objective?: string;
          ai_confidence?: number;
          position_x?: number | null;
          position_y?: number | null;
          position_z?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ship_name?: string;
          phase?: number;
          overall_health?: number;
          last_telemetry_ms?: number;
          current_objective?: string;
          ai_confidence?: number;
          position_x?: number | null;
          position_y?: number | null;
          position_z?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      telemetry: {
        Row: {
          id: string;
          ship_id: string;
          timestamp: string;
          frame: string;
          position_x: number;
          position_y: number;
          position_z: number;
          velocity_x: number;
          velocity_y: number;
          velocity_z: number;
          orientation_w: number;
          orientation_x: number;
          orientation_y: number;
          orientation_z: number;
          propulsion_health: number;
          thermal_health: number;
          power_health: number;
          nav_health: number;
          comm_health: number;
          battery_percent: number;
          fuel_percent: number;
          hull_temp_k: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          ship_id: string;
          timestamp?: string;
          frame?: string;
          position_x: number;
          position_y: number;
          position_z: number;
          velocity_x?: number;
          velocity_y?: number;
          velocity_z?: number;
          orientation_w?: number;
          orientation_x?: number;
          orientation_y?: number;
          orientation_z?: number;
          propulsion_health?: number;
          thermal_health?: number;
          power_health?: number;
          nav_health?: number;
          comm_health?: number;
          battery_percent?: number;
          fuel_percent?: number;
          hull_temp_k?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          ship_id?: string;
          timestamp?: string;
          frame?: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          velocity_x?: number;
          velocity_y?: number;
          velocity_z?: number;
          orientation_w?: number;
          orientation_x?: number;
          orientation_y?: number;
          orientation_z?: number;
          propulsion_health?: number;
          thermal_health?: number;
          power_health?: number;
          nav_health?: number;
          comm_health?: number;
          battery_percent?: number;
          fuel_percent?: number;
          hull_temp_k?: number;
          created_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          ship_id: string;
          severity: number;
          category: string;
          title: string;
          description: string;
          acknowledged: boolean;
          acknowledged_by: string | null;
          created_at: string;
          acknowledged_at: string | null;
        };
        Insert: {
          id?: string;
          ship_id: string;
          severity?: number;
          category: string;
          title: string;
          description: string;
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          created_at?: string;
          acknowledged_at?: string | null;
        };
        Update: {
          id?: string;
          ship_id?: string;
          severity?: number;
          category?: string;
          title?: string;
          description?: string;
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          created_at?: string;
          acknowledged_at?: string | null;
        };
      };
      ai_decisions: {
        Row: {
          id: string;
          ship_id: string;
          timestamp: string;
          trigger: string;
          action: string;
          alternatives: string[];
          confidence: number;
          impact: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ship_id: string;
          timestamp?: string;
          trigger: string;
          action: string;
          alternatives?: string[];
          confidence?: number;
          impact?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ship_id?: string;
          timestamp?: string;
          trigger?: string;
          action?: string;
          alternatives?: string[];
          confidence?: number;
          impact?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier access
export type Ship = Database['public']['Tables']['ships']['Row'];
export type TelemetryRow = Database['public']['Tables']['telemetry']['Row'];
export type AlertRow = Database['public']['Tables']['alerts']['Row'];
export type AIDecisionRow = Database['public']['Tables']['ai_decisions']['Row'];
