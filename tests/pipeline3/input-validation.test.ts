/**
 * Tests for input validation in Pipeline 3 content tools
 */

import { describe, it, expect } from 'vitest';

// Constants matching the tool implementations
const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

/**
 * Validate and normalize pillar to lowercase
 */
function normalizePillar(pillar: string | null | undefined): string {
  if (!pillar) return 'health';
  const normalized = pillar.toLowerCase();
  return VALID_PILLARS.includes(normalized as typeof VALID_PILLARS[number])
    ? normalized
    : 'health';
}

/**
 * Validate and normalize tone to lowercase
 */
function normalizeTone(tone: string | null | undefined): string {
  if (!tone) return 'inspiring';
  const normalized = tone.toLowerCase();
  return VALID_TONES.includes(normalized as typeof VALID_TONES[number])
    ? normalized
    : 'inspiring';
}

/**
 * Validate content.generate_quote_card input
 */
function validateQuoteCardInput(args: { quote_id?: string }): { valid: boolean; error?: string } {
  if (!args.quote_id) {
    return { valid: false, error: 'quote_id is required' };
  }
  return { valid: true };
}

/**
 * Validate content.generate_carousel_outline input
 */
function validateCarouselInput(args: { theme_id?: string }): { valid: boolean; error?: string } {
  if (!args.theme_id) {
    return { valid: false, error: 'theme_id is required' };
  }
  return { valid: true };
}

/**
 * Validate content.generate_shortform_script input
 */
function validateShortformScriptInput(args: {
  quote_id?: string;
  theme_id?: string;
  guest_id?: string;
}): { valid: boolean; error?: string } {
  if (!args.quote_id && !args.theme_id && !args.guest_id) {
    return { valid: false, error: 'At least one of quote_id, theme_id, or guest_id is required' };
  }
  return { valid: true };
}

/**
 * Validate content.generate_post_ideas input
 */
function validatePostIdeasInput(args: {
  guest_id?: string;
  theme_id?: string;
  max_ideas?: number;
}): { valid: boolean; error?: string } {
  if (!args.guest_id && !args.theme_id) {
    return { valid: false, error: 'At least one of guest_id or theme_id is required' };
  }
  return { valid: true };
}

describe('Pillar Normalization (Pipeline 3)', () => {
  it('should normalize valid pillars to lowercase', () => {
    expect(normalizePillar('Health')).toBe('health');
    expect(normalizePillar('WEALTH')).toBe('wealth');
    expect(normalizePillar('Connection')).toBe('connection');
    expect(normalizePillar('health')).toBe('health');
  });

  it('should default to health for invalid pillars', () => {
    expect(normalizePillar('fitness')).toBe('health');
    expect(normalizePillar('money')).toBe('health');
    expect(normalizePillar('invalid')).toBe('health');
  });

  it('should default to health for null/undefined', () => {
    expect(normalizePillar(null)).toBe('health');
    expect(normalizePillar(undefined)).toBe('health');
    expect(normalizePillar('')).toBe('health');
  });
});

describe('Tone Normalization (Pipeline 3)', () => {
  it('should normalize valid tones to lowercase', () => {
    expect(normalizeTone('Inspiring')).toBe('inspiring');
    expect(normalizeTone('TACTICAL')).toBe('tactical');
    expect(normalizeTone('Reflective')).toBe('reflective');
    expect(normalizeTone('inspiring')).toBe('inspiring');
  });

  it('should default to inspiring for invalid tones', () => {
    expect(normalizeTone('angry')).toBe('inspiring');
    expect(normalizeTone('happy')).toBe('inspiring');
    expect(normalizeTone('casual')).toBe('inspiring');
  });

  it('should default to inspiring for null/undefined', () => {
    expect(normalizeTone(null)).toBe('inspiring');
    expect(normalizeTone(undefined)).toBe('inspiring');
    expect(normalizeTone('')).toBe('inspiring');
  });
});

describe('Quote Card Input Validation', () => {
  it('should require quote_id', () => {
    const result = validateQuoteCardInput({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('quote_id');
  });

  it('should accept valid quote_id', () => {
    const result = validateQuoteCardInput({ quote_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });
});

describe('Carousel Outline Input Validation', () => {
  it('should require theme_id', () => {
    const result = validateCarouselInput({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('theme_id');
  });

  it('should accept valid theme_id', () => {
    const result = validateCarouselInput({ theme_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });
});

describe('Shortform Script Input Validation', () => {
  it('should require at least one ID', () => {
    const result = validateShortformScriptInput({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one');
  });

  it('should accept quote_id alone', () => {
    const result = validateShortformScriptInput({ quote_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });

  it('should accept theme_id alone', () => {
    const result = validateShortformScriptInput({ theme_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });

  it('should accept guest_id alone', () => {
    const result = validateShortformScriptInput({ guest_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });

  it('should accept multiple IDs', () => {
    const result = validateShortformScriptInput({
      quote_id: 'abc-123',
      theme_id: 'def-456',
    });
    expect(result.valid).toBe(true);
  });
});

describe('Post Ideas Input Validation', () => {
  it('should require at least guest_id or theme_id', () => {
    const result = validatePostIdeasInput({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('At least one');
  });

  it('should accept guest_id alone', () => {
    const result = validatePostIdeasInput({ guest_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });

  it('should accept theme_id alone', () => {
    const result = validatePostIdeasInput({ theme_id: 'abc-123' });
    expect(result.valid).toBe(true);
  });

  it('should accept both guest_id and theme_id', () => {
    const result = validatePostIdeasInput({
      guest_id: 'abc-123',
      theme_id: 'def-456',
    });
    expect(result.valid).toBe(true);
  });

  it('should accept max_ideas as optional', () => {
    const result = validatePostIdeasInput({
      guest_id: 'abc-123',
      max_ideas: 10,
    });
    expect(result.valid).toBe(true);
  });
});

