/**
 * Supabase Database Types
 * 
 * These types reflect the ACTUAL schema from your Supabase project.
 * Tables use user_id (text) not org_id for access control.
 * 
 * Run `npx supabase gen types typescript` to regenerate from your project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ==========================================
      // Core Brain Tables (new)
      // ==========================================
      brain_items: {
        Row: {
          id: string
          type: string
          title: string
          content: string
          version: number
          metadata: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          type: string
          title: string
          content: string
          version?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          type?: string
          title?: string
          content?: string
          version?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      themes: {
        Row: {
          id: string
          name: string
          description: string | null
          pillar: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          pillar?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          pillar?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      agent_sessions: {
        Row: {
          id: string
          user_id: string | null
          runtime_version: string
          started_at: string
          ended_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string | null
          runtime_version?: string
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          runtime_version?: string
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: string
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: string
          content?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      agent_memory: {
        Row: {
          id: string
          session_id: string | null
          key: string
          value: Json
          memory_type: string
          expires_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          key: string
          value: Json
          memory_type?: string
          expires_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          key?: string
          value?: Json
          memory_type?: string
          expires_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      // ==========================================
      // Existing ai_tool_logs (extended)
      // ==========================================
      ai_tool_logs: {
        Row: {
          id: string
          session_id: string | null
          user_id: string | null
          tool_name: string | null
          tool_version: string | null
          input: Json | null
          output: Json | null
          status: string | null
          duration_ms: number | null
          error_message: string | null
          writes: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          tool_name?: string | null
          tool_version?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
          duration_ms?: number | null
          error_message?: string | null
          writes?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          user_id?: string | null
          tool_name?: string | null
          tool_version?: string | null
          input?: Json | null
          output?: Json | null
          status?: string | null
          duration_ms?: number | null
          error_message?: string | null
          writes?: Json | null
          created_at?: string | null
        }
      }
      // ==========================================
      // Existing guests table (extended)
      // ==========================================
      guests: {
        Row: {
          id: string
          name: string | null
          company: string | null
          podcast_url: string | null
          website: string | null
          instagram: string | null
          linkedin: string | null
          youtube: string | null
          bio: string | null
          email: string | null
          title: string | null
          industry: string | null
          expertise: string[] | null
          pillar: string | null
          unique_pov: string | null
          social_links: Json | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          company?: string | null
          podcast_url?: string | null
          website?: string | null
          instagram?: string | null
          linkedin?: string | null
          youtube?: string | null
          bio?: string | null
          email?: string | null
          title?: string | null
          industry?: string | null
          expertise?: string[] | null
          pillar?: string | null
          unique_pov?: string | null
          social_links?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          company?: string | null
          podcast_url?: string | null
          website?: string | null
          instagram?: string | null
          linkedin?: string | null
          youtube?: string | null
          bio?: string | null
          email?: string | null
          title?: string | null
          industry?: string | null
          expertise?: string[] | null
          pillar?: string | null
          unique_pov?: string | null
          social_links?: Json | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // ==========================================
      // Existing interviews table (extended)
      // ==========================================
      interviews: {
        Row: {
          id: string
          guest_id: string | null
          raw_transcript: string | null
          processed_transcript: Json | null
          published_at: string | null
          title: string | null
          status: string | null
          recorded_at: string | null
          summary: string | null
          transcript_url: string | null
          audio_url: string | null
          video_url: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          guest_id?: string | null
          raw_transcript?: string | null
          processed_transcript?: Json | null
          published_at?: string | null
          title?: string | null
          status?: string | null
          recorded_at?: string | null
          summary?: string | null
          transcript_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          guest_id?: string | null
          raw_transcript?: string | null
          processed_transcript?: Json | null
          published_at?: string | null
          title?: string | null
          status?: string | null
          recorded_at?: string | null
          summary?: string | null
          transcript_url?: string | null
          audio_url?: string | null
          video_url?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // ==========================================
      // Existing interview_quotes table (extended)
      // ==========================================
      interview_quotes: {
        Row: {
          id: string
          interview_id: string | null
          guest_id: string | null
          quote: string | null
          context: string | null
          sentiment: string | null
          theme: string | null
          pillar: string | null
          emotional_insight: string | null
          is_highlight: boolean | null
          tags: string[] | null
          timestamp_start: number | null
          timestamp_end: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          interview_id?: string | null
          guest_id?: string | null
          quote?: string | null
          context?: string | null
          sentiment?: string | null
          theme?: string | null
          pillar?: string | null
          emotional_insight?: string | null
          is_highlight?: boolean | null
          tags?: string[] | null
          timestamp_start?: number | null
          timestamp_end?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          interview_id?: string | null
          guest_id?: string | null
          quote?: string | null
          context?: string | null
          sentiment?: string | null
          theme?: string | null
          pillar?: string | null
          emotional_insight?: string | null
          is_highlight?: boolean | null
          tags?: string[] | null
          timestamp_start?: number | null
          timestamp_end?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      // ==========================================
      // New tables
      // ==========================================
      interview_themes: {
        Row: {
          id: string
          interview_id: string
          theme_id: string
          confidence: number | null
          notes: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          theme_id: string
          confidence?: number | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          theme_id?: string
          confidence?: number | null
          notes?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      guest_scores: {
        Row: {
          id: string
          guest_id: string
          score_type: string
          score: number
          factors: Json
          rules_version: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          score_type: string
          score: number
          factors?: Json
          rules_version?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guest_id?: string
          score_type?: string
          score?: number
          factors?: Json
          rules_version?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      outreach_events: {
        Row: {
          id: string
          guest_id: string | null
          prospect_id: string | null
          event_type: string
          channel: string
          subject: string | null
          content: string | null
          status: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          guest_id?: string | null
          prospect_id?: string | null
          event_type: string
          channel: string
          subject?: string | null
          content?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          guest_id?: string | null
          prospect_id?: string | null
          event_type?: string
          channel?: string
          subject?: string | null
          content?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      followups: {
        Row: {
          id: string
          related_type: string
          related_id: string
          action: string
          due_at: string
          completed_at: string | null
          priority: string
          notes: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          related_type: string
          related_id: string
          action: string
          due_at: string
          completed_at?: string | null
          priority?: string
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          related_type?: string
          related_id?: string
          action?: string
          due_at?: string
          completed_at?: string | null
          priority?: string
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
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
