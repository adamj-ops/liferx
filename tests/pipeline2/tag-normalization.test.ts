/**
 * Tests for tag normalization in interviews.auto_tag
 */

import { describe, it, expect } from 'vitest';

// Constants from the auto_tag tool
const VALID_PILLARS = ['Health', 'Wealth', 'Connection'];
const VALID_TONES = ['inspiring', 'tactical', 'reflective'];

/**
 * Normalize tags as done in interviews.auto_tag
 */
function normalizeTags(analysis: {
  industries?: string[];
  expertise?: string[];
  pillars?: string[];
  tones?: string[];
}) {
  return {
    industries: (analysis.industries || [])
      .map((i: string) => i.toLowerCase().trim())
      .filter((i: string) => i.length > 0)
      .slice(0, 10),
    expertise: (analysis.expertise || [])
      .map((e: string) => e.toLowerCase().trim())
      .filter((e: string) => e.length > 0)
      .slice(0, 10),
    pillars: (analysis.pillars || [])
      .filter((p: string) => VALID_PILLARS.includes(p))
      .slice(0, 3),
    tones: (analysis.tones || [])
      .filter((t: string) => VALID_TONES.includes(t))
      .slice(0, 3),
  };
}

describe('Tag Normalization', () => {
  describe('industries', () => {
    it('should lowercase all industries', () => {
      const result = normalizeTags({
        industries: ['Healthcare', 'FinTech', 'EDUCATION'],
      });
      expect(result.industries).toEqual(['healthcare', 'fintech', 'education']);
    });

    it('should trim whitespace from industries', () => {
      const result = normalizeTags({
        industries: ['  healthcare  ', '\tfintech\n'],
      });
      expect(result.industries).toEqual(['healthcare', 'fintech']);
    });

    it('should filter out empty industries', () => {
      const result = normalizeTags({
        industries: ['healthcare', '', '  ', 'fintech'],
      });
      expect(result.industries).toEqual(['healthcare', 'fintech']);
    });

    it('should limit industries to 10', () => {
      const result = normalizeTags({
        industries: Array(15).fill(null).map((_, i) => `industry${i}`),
      });
      expect(result.industries).toHaveLength(10);
    });
  });

  describe('expertise', () => {
    it('should lowercase all expertise areas', () => {
      const result = normalizeTags({
        expertise: ['Mindfulness', 'Investing', 'LEADERSHIP'],
      });
      expect(result.expertise).toEqual(['mindfulness', 'investing', 'leadership']);
    });

    it('should limit expertise to 10', () => {
      const result = normalizeTags({
        expertise: Array(15).fill(null).map((_, i) => `expertise${i}`),
      });
      expect(result.expertise).toHaveLength(10);
    });
  });

  describe('pillars', () => {
    it('should only accept valid pillars', () => {
      const result = normalizeTags({
        pillars: ['Health', 'Wealth', 'Connection'],
      });
      expect(result.pillars).toEqual(['Health', 'Wealth', 'Connection']);
    });

    it('should reject invalid pillars', () => {
      const result = normalizeTags({
        pillars: ['Health', 'Fitness', 'Money', 'Connection'],
      });
      expect(result.pillars).toEqual(['Health', 'Connection']);
    });

    it('should be case-sensitive for pillars (as per spec)', () => {
      const result = normalizeTags({
        pillars: ['health', 'WEALTH', 'connection'],
      });
      expect(result.pillars).toEqual([]);
    });

    it('should limit pillars to 3', () => {
      const result = normalizeTags({
        pillars: ['Health', 'Wealth', 'Connection', 'Health', 'Wealth'],
      });
      expect(result.pillars).toHaveLength(3);
    });
  });

  describe('tones', () => {
    it('should only accept valid tones', () => {
      const result = normalizeTags({
        tones: ['inspiring', 'tactical', 'reflective'],
      });
      expect(result.tones).toEqual(['inspiring', 'tactical', 'reflective']);
    });

    it('should reject invalid tones', () => {
      const result = normalizeTags({
        tones: ['inspiring', 'angry', 'happy', 'tactical'],
      });
      expect(result.tones).toEqual(['inspiring', 'tactical']);
    });

    it('should be case-sensitive for tones', () => {
      const result = normalizeTags({
        tones: ['Inspiring', 'TACTICAL', 'Reflective'],
      });
      expect(result.tones).toEqual([]);
    });

    it('should limit tones to 3', () => {
      const result = normalizeTags({
        tones: ['inspiring', 'tactical', 'reflective', 'inspiring'],
      });
      expect(result.tones).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined input', () => {
      const result = normalizeTags({});
      expect(result).toEqual({
        industries: [],
        expertise: [],
        pillars: [],
        tones: [],
      });
    });

    it('should handle null-like values', () => {
      const result = normalizeTags({
        industries: undefined,
        expertise: undefined,
        pillars: undefined,
        tones: undefined,
      });
      expect(result).toEqual({
        industries: [],
        expertise: [],
        pillars: [],
        tones: [],
      });
    });
  });
});

