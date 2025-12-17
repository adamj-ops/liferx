/**
 * Tests for org_id filtering in RAG and tool execution
 */

import { describe, it, expect } from 'vitest';
import { isValidUUID, getEffectiveOrgId, DEFAULT_ORG_UUID } from '../../src/lib/constants';

describe('UUID Validation', () => {
  describe('isValidUUID', () => {
    it('should accept valid UUIDs', () => {
      expect(isValidUUID('3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d')).toBe(true);
      expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
      expect(isValidUUID('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
      expect(isValidUUID('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('operator')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
      expect(isValidUUID('3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5')).toBe(false); // Too short
      expect(isValidUUID('3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5dd')).toBe(false); // Too long
      expect(isValidUUID('3b9d9c2a6a1c4f2b8d6e0a7e3c2f1b5d')).toBe(false); // No hyphens
    });

    it('should be case-insensitive', () => {
      expect(isValidUUID('3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d')).toBe(true);
      expect(isValidUUID('3B9D9C2A-6A1C-4F2B-8D6E-0A7E3C2F1B5D')).toBe(true);
      expect(isValidUUID('3B9d9c2A-6A1c-4F2b-8D6e-0A7e3C2f1B5d')).toBe(true);
    });
  });

  describe('DEFAULT_ORG_UUID', () => {
    it('should be a valid UUID', () => {
      expect(isValidUUID(DEFAULT_ORG_UUID)).toBe(true);
    });

    it('should match the expected stable UUID', () => {
      expect(DEFAULT_ORG_UUID).toBe('3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d');
    });
  });

  describe('getEffectiveOrgId', () => {
    it('should return provided UUID if valid', () => {
      const customUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      expect(getEffectiveOrgId(customUUID)).toBe(customUUID);
    });

    it('should return default UUID if provided value is invalid', () => {
      expect(getEffectiveOrgId('operator')).toBe(DEFAULT_ORG_UUID);
      expect(getEffectiveOrgId('')).toBe(DEFAULT_ORG_UUID);
      expect(getEffectiveOrgId('invalid')).toBe(DEFAULT_ORG_UUID);
    });

    it('should return default UUID if no value provided', () => {
      expect(getEffectiveOrgId(undefined)).toBe(DEFAULT_ORG_UUID);
      expect(getEffectiveOrgId()).toBe(DEFAULT_ORG_UUID);
    });
  });
});

describe('Org Isolation Logic', () => {
  /**
   * Simulates the org isolation logic in match_ai_chunks RPC
   */
  function matchesOrg(chunkOrgId: string | null, matchOrgId: string | null): boolean {
    // Logic from the RPC: (match_org_id IS NULL OR ac.org_id = match_org_id OR ac.org_id IS NULL)
    if (matchOrgId === null) {
      return true; // No filter applied
    }
    if (chunkOrgId === matchOrgId) {
      return true; // Exact match
    }
    if (chunkOrgId === null) {
      return true; // Legacy data with NULL org_id is always included
    }
    return false;
  }

  describe('org isolation behavior', () => {
    const orgA = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d';
    const orgB = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    it('should match chunks with same org_id', () => {
      expect(matchesOrg(orgA, orgA)).toBe(true);
      expect(matchesOrg(orgB, orgB)).toBe(true);
    });

    it('should not match chunks with different org_id', () => {
      expect(matchesOrg(orgA, orgB)).toBe(false);
      expect(matchesOrg(orgB, orgA)).toBe(false);
    });

    it('should include legacy chunks (NULL org_id) when filtering', () => {
      expect(matchesOrg(null, orgA)).toBe(true);
      expect(matchesOrg(null, orgB)).toBe(true);
    });

    it('should match all chunks when no filter applied', () => {
      expect(matchesOrg(orgA, null)).toBe(true);
      expect(matchesOrg(orgB, null)).toBe(true);
      expect(matchesOrg(null, null)).toBe(true);
    });
  });

  describe('query simulation', () => {
    const orgA = '3b9d9c2a-6a1c-4f2b-8d6e-0a7e3c2f1b5d';
    const orgB = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    // Simulated chunks database
    const chunks = [
      { id: 1, org_id: orgA, content: 'Org A content 1' },
      { id: 2, org_id: orgA, content: 'Org A content 2' },
      { id: 3, org_id: orgB, content: 'Org B content 1' },
      { id: 4, org_id: null, content: 'Legacy content (no org)' },
    ];

    function filterChunks(matchOrgId: string | null) {
      return chunks.filter(chunk => matchesOrg(chunk.org_id, matchOrgId));
    }

    it('should return only org A and legacy chunks when filtering by org A', () => {
      const results = filterChunks(orgA);
      expect(results.map(r => r.id)).toEqual([1, 2, 4]);
    });

    it('should return only org B and legacy chunks when filtering by org B', () => {
      const results = filterChunks(orgB);
      expect(results.map(r => r.id)).toEqual([3, 4]);
    });

    it('should return all chunks when no filter applied', () => {
      const results = filterChunks(null);
      expect(results.map(r => r.id)).toEqual([1, 2, 3, 4]);
    });
  });
});

describe('Tool Context Org ID', () => {
  interface ToolContext {
    org_id: string;
    allowWrites: boolean;
  }

  /**
   * Simulates the context building logic in /api/tools/execute
   */
  function buildContext(providedOrgId?: string): ToolContext {
    // Validate org_id if provided - must be a valid UUID
    if (providedOrgId && !isValidUUID(providedOrgId)) {
      throw new Error('org_id must be a valid UUID');
    }

    return {
      org_id: getEffectiveOrgId(providedOrgId),
      allowWrites: false,
    };
  }

  it('should accept valid UUID org_id', () => {
    const context = buildContext('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(context.org_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('should throw error for invalid org_id', () => {
    expect(() => buildContext('operator')).toThrow('org_id must be a valid UUID');
    expect(() => buildContext('invalid')).toThrow('org_id must be a valid UUID');
  });

  it('should use default UUID when no org_id provided', () => {
    const context = buildContext(undefined);
    expect(context.org_id).toBe(DEFAULT_ORG_UUID);
  });

  it('should use default UUID when empty string provided', () => {
    // Empty string fails UUID validation, but our logic uses getEffectiveOrgId
    // In the actual API, empty string would fail the isValidUUID check first
    // Let's test the getEffectiveOrgId behavior
    expect(getEffectiveOrgId('')).toBe(DEFAULT_ORG_UUID);
  });
});

