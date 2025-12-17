/**
 * Shared constants for LifeRX
 */

/**
 * Default organization UUID for single-org deployment.
 * This UUID is used as the default for all org_id columns in the database.
 * It's also used as a fallback when no org_id is provided in API requests.
 */
export const DEFAULT_ORG_UUID = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d';

/**
 * UUID validation regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Get the effective org_id from various sources.
 * Priority:
 * 1. Provided value (if valid UUID)
 * 2. DEFAULT_ORG_ID env var (if valid UUID)
 * 3. Stable default UUID constant
 */
export function getEffectiveOrgId(providedOrgId?: string): string {
  // If provided and valid, use it
  if (providedOrgId && isValidUUID(providedOrgId)) {
    return providedOrgId;
  }
  
  // Check env var
  const envOrgId = process.env.DEFAULT_ORG_ID;
  if (envOrgId && isValidUUID(envOrgId)) {
    return envOrgId;
  }
  
  // Fall back to stable default
  return DEFAULT_ORG_UUID;
}

