/**
 * Tests for quote validation in interviews.extract_defining_quotes
 */

import { describe, it, expect } from 'vitest';

// Constants from the tool
const VALID_PILLARS = ['Health', 'Wealth', 'Connection'] as const;
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;

interface ProposedQuote {
  quote: string;
  topic: string;
  pillar: string;
  tone: string;
  rationale: string;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a proposed quote as done in interviews.extract_defining_quotes
 */
function validateQuote(q: ProposedQuote): ValidationResult {
  // Validate pillar
  if (!VALID_PILLARS.includes(q.pillar as typeof VALID_PILLARS[number])) {
    return { valid: false, reason: `Invalid pillar: ${q.pillar}` };
  }

  // Validate tone
  if (!VALID_TONES.includes(q.tone as typeof VALID_TONES[number])) {
    return { valid: false, reason: `Invalid tone: ${q.tone}` };
  }

  // Check quote is not too short
  if (!q.quote || q.quote.trim().length < 20) {
    return { valid: false, reason: 'Quote too short' };
  }

  // Check quote is not too long
  if (q.quote.length > 500) {
    return { valid: false, reason: 'Quote too long' };
  }

  return { valid: true };
}

/**
 * Check if a quote appears to be a paraphrase (third-person)
 * rather than a direct first-person quote.
 */
function isParaphrase(quote: string): boolean {
  const paraphrasePatterns = [
    /^(they|he|she|it)\s+(said|mentioned|believes?|thinks?|argues?)/i,
    /^according to/i,
    /^(the|a) (speaker|guest|interviewee)/i,
    /\bsaid that\b/i,
    /\bbelieves that\b/i,
  ];
  
  return paraphrasePatterns.some(pattern => pattern.test(quote.trim()));
}

describe('Quote Validation', () => {
  describe('pillar validation', () => {
    it('should accept valid pillars', () => {
      const validQuote: ProposedQuote = {
        quote: 'This is a valid quote that is long enough.',
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      expect(validateQuote(validQuote).valid).toBe(true);
    });

    it('should reject invalid pillars', () => {
      const invalidQuote: ProposedQuote = {
        quote: 'This is a valid quote that is long enough.',
        topic: 'motivation',
        pillar: 'Fitness', // Invalid
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      const result = validateQuote(invalidQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid pillar');
    });
  });

  describe('tone validation', () => {
    it('should accept valid tones', () => {
      for (const tone of VALID_TONES) {
        const quote: ProposedQuote = {
          quote: 'This is a valid quote that is long enough.',
          topic: 'motivation',
          pillar: 'Health',
          tone,
          rationale: 'Test rationale',
        };
        expect(validateQuote(quote).valid).toBe(true);
      }
    });

    it('should reject invalid tones', () => {
      const invalidQuote: ProposedQuote = {
        quote: 'This is a valid quote that is long enough.',
        topic: 'motivation',
        pillar: 'Health',
        tone: 'angry', // Invalid
        rationale: 'Test rationale',
      };
      const result = validateQuote(invalidQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid tone');
    });
  });

  describe('quote length validation', () => {
    it('should reject quotes that are too short', () => {
      const shortQuote: ProposedQuote = {
        quote: 'Too short', // < 20 chars
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      const result = validateQuote(shortQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too short');
    });

    it('should reject empty quotes', () => {
      const emptyQuote: ProposedQuote = {
        quote: '',
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      const result = validateQuote(emptyQuote);
      expect(result.valid).toBe(false);
    });

    it('should reject quotes that are too long', () => {
      const longQuote: ProposedQuote = {
        quote: 'a'.repeat(501), // > 500 chars
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      const result = validateQuote(longQuote);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too long');
    });

    it('should accept quotes at the boundary (20-500 chars)', () => {
      const minQuote: ProposedQuote = {
        quote: 'a'.repeat(20),
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      expect(validateQuote(minQuote).valid).toBe(true);

      const maxQuote: ProposedQuote = {
        quote: 'a'.repeat(500),
        topic: 'motivation',
        pillar: 'Health',
        tone: 'inspiring',
        rationale: 'Test rationale',
      };
      expect(validateQuote(maxQuote).valid).toBe(true);
    });
  });
});

describe('Paraphrase Rejection', () => {
  describe('should identify paraphrases', () => {
    it('should detect "They said" patterns', () => {
      expect(isParaphrase('They said that life is about balance.')).toBe(true);
      expect(isParaphrase('He said we should focus on health.')).toBe(true);
      expect(isParaphrase('She mentioned the importance of connection.')).toBe(true);
    });

    it('should detect "According to" patterns', () => {
      expect(isParaphrase('According to the speaker, health comes first.')).toBe(true);
    });

    it('should detect third-person references', () => {
      expect(isParaphrase('The speaker believes in daily meditation.')).toBe(true);
      expect(isParaphrase('The guest thinks that wealth is overrated.')).toBe(true);
    });

    it('should detect indirect speech patterns', () => {
      expect(isParaphrase('He believes that morning routines are key.')).toBe(true);
      expect(isParaphrase('She thinks we should all practice gratitude.')).toBe(true);
    });
  });

  describe('should accept direct quotes', () => {
    it('should accept first-person statements', () => {
      expect(isParaphrase('I wake up every morning at 5am.')).toBe(false);
      expect(isParaphrase("My morning routine changed my life.")).toBe(false);
      expect(isParaphrase("We need to prioritize our health.")).toBe(false);
    });

    it('should accept imperative statements', () => {
      expect(isParaphrase('Focus on what matters most.')).toBe(false);
      expect(isParaphrase('Start your day with intention.')).toBe(false);
    });

    it('should accept declarative statements', () => {
      expect(isParaphrase('Health is the foundation of everything.')).toBe(false);
      expect(isParaphrase('Success means different things to different people.')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(isParaphrase('')).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      expect(isParaphrase('   ')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isParaphrase('THEY SAID life is beautiful.')).toBe(true);
      expect(isParaphrase('According To the expert...')).toBe(true);
    });
  });
});

