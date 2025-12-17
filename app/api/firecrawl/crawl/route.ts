import { NextRequest, NextResponse } from 'next/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

interface CrawlRequest {
  url: string;
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
}

interface CrawlStatusResponse {
  success: boolean;
  status: 'scraping' | 'completed' | 'failed';
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: Array<{
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  }>;
  error?: string;
}

/**
 * POST /api/firecrawl/crawl
 *
 * Starts a crawl job for a website using Firecrawl API.
 * Returns a job ID that can be used to check status.
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

  let body: CrawlRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const {
    url,
    limit = 10,
    maxDepth = 2,
    includePaths,
    excludePaths,
    allowBackwardLinks = false,
    allowExternalLinks = false,
  } = body;

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
    const firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        limit,
        maxDepth,
        includePaths,
        excludePaths,
        allowBackwardLinks,
        allowExternalLinks,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[firecrawl/crawl] API error:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Firecrawl API error: ${firecrawlResponse.status}`,
          details: errorText,
        },
        { status: firecrawlResponse.status }
      );
    }

    const result = await firecrawlResponse.json();

    return NextResponse.json({
      success: true,
      jobId: result.id,
      message: 'Crawl job started. Use GET /api/firecrawl/crawl?jobId=<id> to check status.',
    });
  } catch (error) {
    console.error('[firecrawl/crawl] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start crawl',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/firecrawl/crawl?jobId=<id>
 *
 * Gets the status of a crawl job.
 */
export async function GET(request: NextRequest) {
  if (!FIRECRAWL_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'Firecrawl API key not configured',
      },
      { status: 500 }
    );
  }

  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'jobId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const firecrawlResponse = await fetch(`${FIRECRAWL_API_URL}/crawl/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[firecrawl/crawl] Status check error:', errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Firecrawl API error: ${firecrawlResponse.status}`,
          details: errorText,
        },
        { status: firecrawlResponse.status }
      );
    }

    const result: CrawlStatusResponse = await firecrawlResponse.json();

    return NextResponse.json({
      success: true,
      status: result.status,
      completed: result.completed,
      total: result.total,
      creditsUsed: result.creditsUsed,
      data: result.data,
    });
  } catch (error) {
    console.error('[firecrawl/crawl] Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check crawl status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
