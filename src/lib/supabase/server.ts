import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role privileges.
 * Use this ONLY in server-side code (API routes, server actions).
 * This bypasses RLS - use responsibly.
 * 
 * Note: We don't use the Database generic here to avoid type conflicts
 * with the dynamic schema. Type assertions are used at call sites.
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Singleton service client for reuse within the same request context.
 * Be careful: this maintains state across the module.
 */
let _serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createServiceClient();
  }
  return _serviceClient;
}

/**
 * Alias for createServiceClient - for consistency with common naming patterns
 */
export const createServerClient = createServiceClient;
