import { NextRequest, NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface ScrapeRequest {
  url: string;
  formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    screenshot?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
    };
  };
  error?: string;
}

/**
 * POST /api/firecrawl/scrape
 *
 * Scrapes a URL using Firecrawl API and returns the content.
 * Useful for extracting clean content from web pages.
 */
export async function POST(request: NextRequest) {
  if (!FIRECRAWL_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'Firecrawl API key not configured',
        message: 'Set FIRECRAWL_API_KEY in environment variables',
      },
      { status: 500 }
    );
  }

  let body: ScrapeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { url, formats = ['markdown'], onlyMainContent = true, includeTags, excludeTags, waitFor } = body;

  if (!url) {
    return NextResponse.json(
      { success: false, error: 'URL is required' },
      { status: 400 }
    );
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  try {
    const firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent,
        includeTags,
        excludeTags,
        waitFor,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[firecrawl/scrape] API error:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Firecrawl API error: ${firecrawlResponse.status}`,
          details: errorText,
        },
        { status: firecrawlResponse.status }
      );
    }

    const result: FirecrawlResponse = await firecrawlResponse.json();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Scraping failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[firecrawl/scrape] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scrape URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
