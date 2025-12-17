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
      account: {
        Row: {
          accessToken: string | null
          accessTokenExpiresAt: string | null
          accountId: string
          createdAt: string
          id: string
          idToken: string | null
          password: string | null
          providerId: string
          refreshToken: string | null
          refreshTokenExpiresAt: string | null
          scope: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId: string
          createdAt: string
          id: string
          idToken?: string | null
          password?: string | null
          providerId: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          accessToken?: string | null
          accessTokenExpiresAt?: string | null
          accountId?: string
          createdAt?: string
          id?: string
          idToken?: string | null
          password?: string | null
          providerId?: string
          refreshToken?: string | null
          refreshTokenExpiresAt?: string | null
          scope?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key: string
          memory_type: string
          metadata: Json | null
          session_id: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          memory_type?: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          memory_type?: string
          metadata?: Json | null
          session_id?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          metadata: Json | null
          runtime_version: string
          started_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          runtime_version?: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          runtime_version?: string
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_brain_conversations: {
        Row: {
          created_at: string | null
          id: number
          metadata: Json | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_brain_messages: {
        Row: {
          content: string
          conversation_id: number
          created_at: string | null
          documents_referenced: Json | null
          id: number
          metadata: Json | null
          model_used: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: number
          created_at?: string | null
          documents_referenced?: Json | null
          id?: number
          metadata?: Json | null
          model_used?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: number
          created_at?: string | null
          documents_referenced?: Json | null
          id?: number
          metadata?: Json | null
          model_used?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_brain_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_brain_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          role: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          thread_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          thread_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          thread_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_chunks: {
        Row: {
          chunk_index: number | null
          content: string | null
          created_at: string | null
          embedding: string | null
          embedding_1024: string | null
          guest_id: string | null
          id: number
          interview_id: string | null
          metadata: Json | null
          org_id: string
          pillar: string | null
          source_id: string | null
          tags: string[] | null
        }
        Insert: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          embedding_1024?: string | null
          guest_id?: string | null
          id?: number
          interview_id?: string | null
          metadata?: Json | null
          org_id?: string
          pillar?: string | null
          source_id?: string | null
          tags?: string[] | null
        }
        Update: {
          chunk_index?: number | null
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          embedding_1024?: string | null
          guest_id?: string | null
          id?: number
          interview_id?: string | null
          metadata?: Json | null
          org_id?: string
          pillar?: string | null
          source_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ai_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_shares: {
        Row: {
          conversation_id: number
          created_at: string | null
          id: string
          permission: string
          shared_by_user_id: string | null
          shared_with_user_id: string
        }
        Insert: {
          conversation_id: number
          created_at?: string | null
          id?: string
          permission: string
          shared_by_user_id?: string | null
          shared_with_user_id: string
        }
        Update: {
          conversation_id?: number
          created_at?: string | null
          id?: string
          permission?: string
          shared_by_user_id?: string | null
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_shares_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_brain_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_shares_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "ai_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversation_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "ai_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_doc_tags: {
        Row: {
          created_at: string | null
          document_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_doc_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_doc_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_docs: {
        Row: {
          chunk_count: number | null
          content: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          id: string
          metadata: Json | null
          org_id: string
          processing_status: string | null
          source_id: string | null
          source_type: string | null
          source_url: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          processing_status?: string | null
          source_id?: string | null
          source_type?: string | null
          source_url?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          chunk_count?: number | null
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          processing_status?: string | null
          source_id?: string | null
          source_type?: string | null
          source_url?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_document_shares: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          permission: string
          shared_by_user_id: string | null
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          permission: string
          shared_by_user_id?: string | null
          shared_with_user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          permission?: string
          shared_by_user_id?: string | null
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_docs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_shares_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "ai_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "ai_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_search_logs: {
        Row: {
          agent: string
          created_at: string | null
          id: string
          intent: string
          latency_ms: number | null
          org_id: string | null
          query: string
          result_count: number
          session_id: string | null
          similarity_scores: number[] | null
          tokens_used: number | null
          top_result_ids: string[] | null
          was_used_in_response: boolean | null
        }
        Insert: {
          agent: string
          created_at?: string | null
          id?: string
          intent: string
          latency_ms?: number | null
          org_id?: string | null
          query: string
          result_count?: number
          session_id?: string | null
          similarity_scores?: number[] | null
          tokens_used?: number | null
          top_result_ids?: string[] | null
          was_used_in_response?: boolean | null
        }
        Update: {
          agent?: string
          created_at?: string | null
          id?: string
          intent?: string
          latency_ms?: number | null
          org_id?: string | null
          query?: string
          result_count?: number
          session_id?: string | null
          similarity_scores?: number[] | null
          tokens_used?: number | null
          top_result_ids?: string[] | null
          was_used_in_response?: boolean | null
        }
        Relationships: []
      }
      ai_tool_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json | null
          output: Json | null
          session_id: string | null
          status: string | null
          tool_name: string | null
          tool_version: string | null
          user_id: string | null
          writes: Json | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          session_id?: string | null
          status?: string | null
          tool_name?: string | null
          tool_version?: string | null
          user_id?: string | null
          writes?: Json | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          session_id?: string | null
          status?: string | null
          tool_name?: string | null
          tool_version?: string | null
          user_id?: string | null
          writes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_memory: {
        Row: {
          id: string
          key: string | null
          updated_at: string | null
          user_id: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      ai_users: {
        Row: {
          auth_provider: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_workflow_runs: {
        Row: {
          created_at: string | null
          id: string
          input: Json | null
          output: Json | null
          session_id: string | null
          status: string | null
          user_id: string | null
          workflow_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_workflow_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_segments: {
        Row: {
          attributes: Json | null
          created_at: string | null
          criteria: Json | null
          description: string | null
          estimated_size: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string | null
          pillar: string | null
          segment: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          estimated_size?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          pillar?: string | null
          segment?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          estimated_size?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          pillar?: string | null
          segment?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brain_items: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      brain_memories: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          importance: number | null
          metadata: Json | null
          source: string | null
          topic: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          source?: string | null
          topic?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          source?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      content_assets: {
        Row: {
          id: string
          org_id: string
          type: string
          title: string | null
          body: Json
          pillar: string | null
          tone: string | null
          theme_id: string | null
          guest_id: string | null
          interview_id: string | null
          source_quote_ids: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          type: string
          title?: string | null
          body: Json
          pillar?: string | null
          tone?: string | null
          theme_id?: string | null
          guest_id?: string | null
          interview_id?: string | null
          source_quote_ids?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          type?: string
          title?: string | null
          body?: Json
          pillar?: string | null
          tone?: string | null
          theme_id?: string | null
          guest_id?: string | null
          interview_id?: string | null
          source_quote_ids?: string[] | null
          created_at?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          expertise: string[] | null
          full_name: string | null
          has_podcast: boolean | null
          id: string
          industry: string | null
          instagram: string | null
          linkedin: string | null
          metadata: Json | null
          name: string | null
          org_id: string | null
          pillar: string | null
          podcast_url: string | null
          primary_role: string | null
          social_links: Json | null
          socials: Json | null
          title: string | null
          unique_pov: string | null
          updated_at: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string[] | null
          full_name?: string | null
          has_podcast?: boolean | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          metadata?: Json | null
          name?: string | null
          org_id?: string | null
          pillar?: string | null
          podcast_url?: string | null
          primary_role?: string | null
          social_links?: Json | null
          socials?: Json | null
          title?: string | null
          unique_pov?: string | null
          updated_at?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          expertise?: string[] | null
          full_name?: string | null
          has_podcast?: boolean | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          metadata?: Json | null
          name?: string | null
          org_id?: string | null
          pillar?: string | null
          podcast_url?: string | null
          primary_role?: string | null
          social_links?: Json | null
          socials?: Json | null
          title?: string | null
          unique_pov?: string | null
          updated_at?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      guest_personas: {
        Row: {
          beliefs: string[] | null
          content: Json
          created_at: string
          expertise: string[] | null
          generated_at: string
          guest_id: string
          id: string
          metadata: Json | null
          model_version: string | null
          org_id: string | null
          persona_type: string
          source_interview_ids: string[] | null
          source_quote_count: number | null
          summary: string | null
          unique_povs: string[] | null
          updated_at: string
        }
        Insert: {
          beliefs?: string[] | null
          content: Json
          created_at?: string
          expertise?: string[] | null
          generated_at?: string
          guest_id: string
          id?: string
          metadata?: Json | null
          model_version?: string | null
          org_id?: string | null
          persona_type: string
          source_interview_ids?: string[] | null
          source_quote_count?: number | null
          summary?: string | null
          unique_povs?: string[] | null
          updated_at?: string
        }
        Update: {
          beliefs?: string[] | null
          content?: Json
          created_at?: string
          expertise?: string[] | null
          generated_at?: string
          guest_id?: string
          id?: string
          metadata?: Json | null
          model_version?: string | null
          org_id?: string | null
          persona_type?: string
          source_interview_ids?: string[] | null
          source_quote_count?: number | null
          summary?: string | null
          unique_povs?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_personas_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_scores: {
        Row: {
          created_at: string
          factors: Json
          guest_id: string
          id: string
          metadata: Json | null
          org_id: string | null
          rules_version: string
          score: number
          score_0_1: number | null
          score_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          guest_id: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          rules_version?: string
          score: number
          score_0_1?: number | null
          score_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          factors?: Json
          guest_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          rules_version?: string
          score?: number
          score_0_1?: number | null
          score_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_scores_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_quotes: {
        Row: {
          context: string | null
          created_at: string | null
          emotional_insight: string | null
          guest_id: string | null
          id: string
          interview_id: string
          is_highlight: boolean | null
          metadata: Json | null
          org_id: string
          pillar: string | null
          quote: string
          sentiment: string | null
          tags: string[] | null
          theme: string | null
          timestamp_end: number | null
          timestamp_start: number | null
          tone: string | null
          topic: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          emotional_insight?: string | null
          guest_id?: string | null
          id?: string
          interview_id: string
          is_highlight?: boolean | null
          metadata?: Json | null
          org_id?: string
          pillar?: string | null
          quote: string
          sentiment?: string | null
          tags?: string[] | null
          theme?: string | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          tone?: string | null
          topic?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          emotional_insight?: string | null
          guest_id?: string | null
          id?: string
          interview_id?: string
          is_highlight?: boolean | null
          metadata?: Json | null
          org_id?: string
          pillar?: string | null
          quote?: string
          sentiment?: string | null
          tags?: string[] | null
          theme?: string | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          tone?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_quotes_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_quotes_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_themes: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          interview_id: string
          metadata: Json | null
          notes: string | null
          org_id: string | null
          quote_id: string | null
          theme_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          interview_id: string
          metadata?: Json | null
          notes?: string | null
          org_id?: string | null
          quote_id?: string | null
          theme_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          interview_id?: string
          metadata?: Json | null
          notes?: string | null
          org_id?: string | null
          quote_id?: string | null
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_themes_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_themes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "interview_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          audio_url: string | null
          created_at: string | null
          expertise: string[]
          guest_id: string | null
          id: string
          industries: string[]
          metadata: Json | null
          org_id: string
          pillars: string[]
          processed_transcript: Json | null
          published_at: string | null
          raw_transcript: string | null
          recorded_at: string | null
          status: string | null
          summary: string | null
          title: string | null
          tones: string[]
          transcript: string | null
          transcript_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          expertise?: string[]
          guest_id?: string | null
          id?: string
          industries?: string[]
          metadata?: Json | null
          org_id?: string
          pillars?: string[]
          processed_transcript?: Json | null
          published_at?: string | null
          raw_transcript?: string | null
          recorded_at?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          tones?: string[]
          transcript?: string | null
          transcript_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          expertise?: string[]
          guest_id?: string | null
          id?: string
          industries?: string[]
          metadata?: Json | null
          org_id?: string
          pillars?: string[]
          processed_transcript?: Json | null
          published_at?: string | null
          raw_transcript?: string | null
          recorded_at?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          tones?: string[]
          transcript?: string | null
          transcript_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          confidence_score: number | null
          created_at: string
          created_by: string | null
          description: string | null
          evidence: Json | null
          id: string
          metadata: Json | null
          name: string
          org_id: string | null
          pillar: string | null
          rules_version: string | null
          slug: string | null
          tone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          org_id?: string | null
          pillar?: string | null
          rules_version?: string | null
          slug?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string | null
          pillar?: string | null
          rules_version?: string | null
          slug?: string | null
          tone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      // ... additional tables omitted for brevity
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_ai_chunks: {
        Args: {
          match_count?: number
          match_org_id?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          guest_id: string
          id: number
          interview_id: string
          metadata: Json
          org_id: string
          pillar: string
          similarity: number
          source_id: string
          tags: string[]
        }[]
      }
      match_ai_chunks_1024: {
        Args: {
          match_count?: number
          match_org_id?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          guest_id: string
          id: number
          interview_id: string
          metadata: Json
          org_id: string
          pillar: string
          similarity: number
          source_id: string
          tags: string[]
        }[]
      }
      // ... additional functions omitted for brevity
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
