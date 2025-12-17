/**
 * Tests for content asset type constraints and structure
 */

import { describe, it, expect } from 'vitest';

// Valid asset types as defined in the migration
const VALID_ASSET_TYPES = ['quote_card', 'carousel', 'shortform_script', 'post_idea'] as const;
type AssetType = typeof VALID_ASSET_TYPES[number];

// Valid pillars (lowercase in DB)
const VALID_PILLARS = ['health', 'wealth', 'connection'] as const;
type Pillar = typeof VALID_PILLARS[number];

// Valid tones
const VALID_TONES = ['inspiring', 'tactical', 'reflective'] as const;
type Tone = typeof VALID_TONES[number];

interface ContentAsset {
  id: string;
  org_id: string;
  type: AssetType;
  title: string | null;
  body: Record<string, unknown>;
  pillar: Pillar | null;
  tone: Tone | null;
  theme_id: string | null;
  guest_id: string | null;
  interview_id: string | null;
  source_quote_ids: string[] | null;
  created_at: string;
}

/**
 * Validate content asset structure
 */
function validateContentAsset(asset: Partial<ContentAsset>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!asset.org_id) {
    errors.push('org_id is required');
  }
  if (!asset.type) {
    errors.push('type is required');
  } else if (!VALID_ASSET_TYPES.includes(asset.type as AssetType)) {
    errors.push(`Invalid type: ${asset.type}. Must be one of: ${VALID_ASSET_TYPES.join(', ')}`);
  }
  if (asset.body === undefined || asset.body === null) {
    errors.push('body is required');
  }

  // Constraint checks
  if (asset.pillar && !VALID_PILLARS.includes(asset.pillar as Pillar)) {
    errors.push(`Invalid pillar: ${asset.pillar}. Must be one of: ${VALID_PILLARS.join(', ')}`);
  }
  if (asset.tone && !VALID_TONES.includes(asset.tone as Tone)) {
    errors.push(`Invalid tone: ${asset.tone}. Must be one of: ${VALID_TONES.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Content Asset Type Validation', () => {
  it('should accept all valid asset types', () => {
    for (const assetType of VALID_ASSET_TYPES) {
      const result = validateContentAsset({
        org_id: 'org-123',
        type: assetType,
        body: { test: 'data' },
      });
      expect(result.valid).toBe(true);
    }
  });

  it('should reject invalid asset types', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'invalid_type' as AssetType,
      body: { test: 'data' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
  });
});

describe('Content Asset Required Fields', () => {
  it('should require org_id', () => {
    const result = validateContentAsset({
      type: 'quote_card',
      body: { test: 'data' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('org_id is required');
  });

  it('should require type', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      body: { test: 'data' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('type is required');
  });

  it('should require body', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('body is required');
  });

  it('should accept minimal valid asset', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
    });
    expect(result.valid).toBe(true);
  });
});

describe('Content Asset Pillar Constraint', () => {
  it('should accept valid pillars', () => {
    for (const pillar of VALID_PILLARS) {
      const result = validateContentAsset({
        org_id: 'org-123',
        type: 'quote_card',
        body: {},
        pillar,
      });
      expect(result.valid).toBe(true);
    }
  });

  it('should accept null pillar', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
      pillar: null,
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid pillar', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
      pillar: 'fitness' as Pillar,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid pillar'))).toBe(true);
  });

  it('should reject Title Case pillars (DB stores lowercase)', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
      pillar: 'Health' as Pillar,
    });
    expect(result.valid).toBe(false);
  });
});

describe('Content Asset Tone Constraint', () => {
  it('should accept valid tones', () => {
    for (const tone of VALID_TONES) {
      const result = validateContentAsset({
        org_id: 'org-123',
        type: 'quote_card',
        body: {},
        tone,
      });
      expect(result.valid).toBe(true);
    }
  });

  it('should accept null tone', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
      tone: null,
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid tone', () => {
    const result = validateContentAsset({
      org_id: 'org-123',
      type: 'quote_card',
      body: {},
      tone: 'angry' as Tone,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid tone'))).toBe(true);
  });
});

describe('Quote Card Body Structure', () => {
  interface QuoteCardBody {
    headline: string;
    subtext: string;
    attribution: string;
    suggested_caption: string;
    pillar: Pillar;
    tone: Tone;
    original_quote: string;
    explainability: {
      why_this_works: string;
    };
  }

  function validateQuoteCardBody(body: Partial<QuoteCardBody>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!body.headline) errors.push('headline is required');
    if (!body.attribution) errors.push('attribution is required');
    if (!body.original_quote) errors.push('original_quote is required');
    if (!body.explainability?.why_this_works) errors.push('explainability.why_this_works is required');
    
    return { valid: errors.length === 0, errors };
  }

  it('should validate complete quote card body', () => {
    const body: QuoteCardBody = {
      headline: 'The Power of Morning Routines',
      subtext: 'How early rising transformed my productivity',
      attribution: '— Jane Doe, CEO at HealthTech',
      suggested_caption: 'Start your day with intention.',
      pillar: 'health',
      tone: 'inspiring',
      original_quote: 'I wake up at 5am every day.',
      explainability: {
        why_this_works: 'This quote captures a clear, actionable habit.',
      },
    };
    
    const result = validateQuoteCardBody(body);
    expect(result.valid).toBe(true);
  });

  it('should require explainability in quote card', () => {
    const body: Partial<QuoteCardBody> = {
      headline: 'Test',
      attribution: '— Test',
      original_quote: 'Test quote',
    };
    
    const result = validateQuoteCardBody(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('explainability.why_this_works is required');
  });
});

describe('Carousel Body Structure', () => {
  interface CarouselSlide {
    slide_number: number;
    type: 'hook' | 'content' | 'cta';
    headline: string;
    body: string;
  }

  interface CarouselBody {
    title: string;
    slides: CarouselSlide[];
    total_slides: number;
    explainability: {
      why_carousel_fits: string;
    };
  }

  function validateCarouselBody(body: Partial<CarouselBody>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!body.title) errors.push('title is required');
    if (!body.slides || body.slides.length === 0) errors.push('slides are required');
    if (body.slides && body.slides.length > 0) {
      // Check for hook slide
      const hookSlides = body.slides.filter(s => s.type === 'hook');
      if (hookSlides.length === 0) errors.push('hook slide is required');
      
      // Check for CTA slide
      const ctaSlides = body.slides.filter(s => s.type === 'cta');
      if (ctaSlides.length === 0) errors.push('CTA slide is required');
      
      // Check slide count (5-8 recommended)
      if (body.slides.length < 5) errors.push('carousel should have at least 5 slides');
      if (body.slides.length > 10) errors.push('carousel should have at most 10 slides');
    }
    
    return { valid: errors.length === 0, errors };
  }

  it('should validate complete carousel body', () => {
    const body: CarouselBody = {
      title: 'Transform Your Morning',
      slides: [
        { slide_number: 1, type: 'hook', headline: 'Hook', body: 'Body' },
        { slide_number: 2, type: 'content', headline: 'Content 1', body: 'Body' },
        { slide_number: 3, type: 'content', headline: 'Content 2', body: 'Body' },
        { slide_number: 4, type: 'content', headline: 'Content 3', body: 'Body' },
        { slide_number: 5, type: 'cta', headline: 'CTA', body: 'Body' },
      ],
      total_slides: 5,
      explainability: {
        why_carousel_fits: 'This theme has depth for multi-slide narrative.',
      },
    };
    
    const result = validateCarouselBody(body);
    expect(result.valid).toBe(true);
  });

  it('should require hook slide', () => {
    const body: CarouselBody = {
      title: 'Test',
      slides: [
        { slide_number: 1, type: 'content', headline: 'Content', body: 'Body' },
        { slide_number: 2, type: 'content', headline: 'Content', body: 'Body' },
        { slide_number: 3, type: 'content', headline: 'Content', body: 'Body' },
        { slide_number: 4, type: 'content', headline: 'Content', body: 'Body' },
        { slide_number: 5, type: 'cta', headline: 'CTA', body: 'Body' },
      ],
      total_slides: 5,
      explainability: { why_carousel_fits: 'Test' },
    };
    
    const result = validateCarouselBody(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('hook slide is required');
  });
});

describe('Post Idea Body Structure', () => {
  interface PostIdeaBody {
    title: string;
    one_sentence_angle: string;
    pillar: Pillar;
    emotional_insight: string;
    explainability: {
      why_ideas_relevant: string;
    };
  }

  function validatePostIdeaBody(body: Partial<PostIdeaBody>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!body.title) errors.push('title is required');
    if (!body.one_sentence_angle) errors.push('one_sentence_angle is required');
    if (!body.pillar) errors.push('pillar is required');
    if (!body.emotional_insight) errors.push('emotional_insight is required');
    
    return { valid: errors.length === 0, errors };
  }

  it('should validate complete post idea body', () => {
    const body: PostIdeaBody = {
      title: 'Why Morning Routines Actually Work',
      one_sentence_angle: 'The science behind why starting your day intentionally changes everything.',
      pillar: 'health',
      emotional_insight: 'Taps into the desire for control and self-improvement.',
      explainability: {
        why_ideas_relevant: 'Based on guest expertise in wellness.',
      },
    };
    
    const result = validatePostIdeaBody(body);
    expect(result.valid).toBe(true);
  });

  it('should require emotional_insight', () => {
    const body: Partial<PostIdeaBody> = {
      title: 'Test',
      one_sentence_angle: 'Test angle',
      pillar: 'health',
    };
    
    const result = validatePostIdeaBody(body);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('emotional_insight is required');
  });
});

