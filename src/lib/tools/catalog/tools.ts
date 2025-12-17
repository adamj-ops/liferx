/**
 * Tool Catalog
 *
 * Complete catalog of all available tools organized by category.
 */

import type { CatalogTool, CategoryInfo, ToolCatalog, ToolCategory } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'research',
    name: 'Research',
    icon: 'Search',
    description: 'Discover and analyze guests, themes, and trends',
  },
  {
    id: 'scoring',
    name: 'Scoring',
    icon: 'BarChart3',
    description: 'Rate, rank, and evaluate prospects',
  },
  {
    id: 'content',
    name: 'Content',
    icon: 'FileText',
    description: 'Generate content ideas and assets',
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: 'MessageSquare',
    description: 'Outreach, follow-ups, and engagement',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'PieChart',
    description: 'Audience insights and data queries',
  },
];

export const TOOLS: CatalogTool[] = [
  // ============================================
  // RESEARCH TOOLS
  // ============================================
  {
    id: 'research.scrape_profile',
    name: 'Scrape Profile',
    description:
      'Gather detailed information about a person including their podcast appearances, company info, social profiles, and bio.',
    category: 'research',
    icon: 'UserSearch',
    status: 'beta',
    parameters: [
      {
        name: 'url',
        label: 'Profile URL',
        type: 'string',
        required: true,
        placeholder: 'https://linkedin.com/in/...',
        description: 'LinkedIn, Twitter, or personal website URL',
      },
      {
        name: 'include_podcast',
        label: 'Include Podcast Appearances',
        type: 'boolean',
        required: false,
        default: true,
      },
      {
        name: 'include_company',
        label: 'Include Company Details',
        type: 'boolean',
        required: false,
        default: true,
      },
    ],
    outputs: {
      description: 'Structured profile data with name, bio, company, social links, and podcast history',
      example: {
        name: 'Jane Doe',
        title: 'CEO at HealthTech',
        bio: '...',
        company: { name: 'HealthTech', industry: 'Healthcare' },
        podcasts: ['The Tim Ferriss Show', 'How I Built This'],
      },
    },
    requiresWrites: true,
    estimatedDuration: '10-30 seconds',
    tags: ['linkedin', 'profile', 'discovery'],
  },
  {
    id: 'research.auto_tag_interview',
    name: 'Auto-Tag Interview',
    description:
      "Automatically tag an interview by guest's expertise, industry, Health/Wealth/Connection focus, and unique perspectives.",
    category: 'research',
    icon: 'Tags',
    status: 'available',
    parameters: [
      {
        name: 'interview_id',
        label: 'Interview',
        type: 'select',
        required: true,
        placeholder: 'Select an interview',
        description: 'The interview to analyze and tag',
        options: [], // Populated dynamically
      },
    ],
    outputs: {
      description: 'Tags for expertise, industry, pillar focus, and key themes',
    },
    toolName: 'interviews.tag_theme',
    requiresWrites: true,
    estimatedDuration: '5-10 seconds',
    tags: ['tagging', 'interview', 'analysis'],
  },
  {
    id: 'research.identify_themes',
    name: 'Identify Themes',
    description:
      'Find recurring themes across multiple interviews (e.g., burnout, financial freedom, community building).',
    category: 'research',
    icon: 'Sparkles',
    status: 'available',
    parameters: [
      {
        name: 'lookback_days',
        label: 'Lookback Period (days)',
        type: 'number',
        required: false,
        default: 30,
        validation: { min: 7, max: 365 },
      },
      {
        name: 'max_interviews',
        label: 'Max Interviews to Analyze',
        type: 'number',
        required: false,
        default: 50,
        validation: { min: 5, max: 200 },
      },
      {
        name: 'dry_run',
        label: 'Preview Only (Dry Run)',
        type: 'boolean',
        required: false,
        default: true,
        description: "Preview themes without saving them",
      },
    ],
    outputs: {
      description: 'List of identified themes with confidence scores and occurrence counts',
    },
    toolName: 'themes.upsert_theme',
    requiresWrites: true,
    estimatedDuration: '1-2 minutes',
    tags: ['themes', 'analysis', 'patterns'],
  },
  {
    id: 'research.generate_bio',
    name: 'Generate Bio',
    description:
      'Create a quick bio/persona for a guest: who they are, what they believe, and what they bring to LifeRX.',
    category: 'research',
    icon: 'User',
    status: 'beta',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [], // Populated dynamically
      },
      {
        name: 'style',
        label: 'Bio Style',
        type: 'select',
        required: false,
        default: 'professional',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'storytelling', label: 'Storytelling' },
        ],
      },
      {
        name: 'length',
        label: 'Length',
        type: 'select',
        required: false,
        default: 'medium',
        options: [
          { value: 'short', label: 'Short (1-2 sentences)' },
          { value: 'medium', label: 'Medium (1 paragraph)' },
          { value: 'long', label: 'Long (2-3 paragraphs)' },
        ],
      },
    ],
    outputs: {
      description: 'Generated bio text with key beliefs and unique value',
    },
    requiresWrites: true,
    estimatedDuration: '5-10 seconds',
    tags: ['bio', 'guest', 'content'],
  },
  {
    id: 'research.extract_quotes',
    name: 'Extract Quotes',
    description:
      'Pull key quotes from an interview that define the guest\'s outlook and perspective.',
    category: 'research',
    icon: 'Quote',
    status: 'available',
    parameters: [
      {
        name: 'interview_id',
        label: 'Interview',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'max_quotes',
        label: 'Max Quotes',
        type: 'number',
        required: false,
        default: 10,
        validation: { min: 1, max: 50 },
      },
      {
        name: 'pillar_filter',
        label: 'Filter by Pillar',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'All Pillars' },
          { value: 'health', label: 'Health' },
          { value: 'wealth', label: 'Wealth' },
          { value: 'connection', label: 'Connection' },
        ],
      },
    ],
    outputs: {
      description: 'List of quotes with topic, pillar, and tone classification',
    },
    toolName: 'interviews.add_quote',
    requiresWrites: true,
    estimatedDuration: '10-20 seconds',
    tags: ['quotes', 'interview', 'content'],
  },
  {
    id: 'research.search_external',
    name: 'Search External Sources',
    description:
      'Search podcasts, LinkedIn, Instagram, and YouTube to discover potential guests.',
    category: 'research',
    icon: 'Globe',
    status: 'coming_soon',
    parameters: [
      {
        name: 'query',
        label: 'Search Query',
        type: 'string',
        required: true,
        placeholder: 'e.g., "health tech founder" or "financial wellness coach"',
      },
      {
        name: 'sources',
        label: 'Sources to Search',
        type: 'multiselect',
        required: false,
        default: ['linkedin', 'podcasts'],
        options: [
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'podcasts', label: 'Podcasts' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'instagram', label: 'Instagram' },
        ],
      },
      {
        name: 'limit',
        label: 'Max Results',
        type: 'number',
        required: false,
        default: 20,
        validation: { min: 5, max: 100 },
      },
    ],
    outputs: {
      description: 'List of potential guests with profile links and relevance scores',
    },
    requiresWrites: false,
    estimatedDuration: '30-60 seconds',
    tags: ['discovery', 'search', 'guests'],
  },
  {
    id: 'research.find_trends',
    name: 'Find Trends',
    description:
      'Monitor current trends in your audience and industry.',
    category: 'research',
    icon: 'TrendingUp',
    status: 'coming_soon',
    parameters: [
      {
        name: 'scope',
        label: 'Trend Scope',
        type: 'select',
        required: true,
        options: [
          { value: 'audience', label: 'Our Audience' },
          { value: 'industry', label: 'Industry-Wide' },
          { value: 'competitors', label: 'Competitors' },
        ],
      },
      {
        name: 'timeframe',
        label: 'Timeframe',
        type: 'select',
        required: false,
        default: '7d',
        options: [
          { value: '24h', label: 'Last 24 Hours' },
          { value: '7d', label: 'Last 7 Days' },
          { value: '30d', label: 'Last 30 Days' },
        ],
      },
    ],
    outputs: {
      description: 'Trending topics with engagement metrics and growth indicators',
    },
    requiresWrites: false,
    estimatedDuration: '15-30 seconds',
    tags: ['trends', 'audience', 'analytics'],
  },
  {
    id: 'research.suggest_format',
    name: 'Suggest Format',
    description:
      'Recommend the best content format for a guest (Instagram video, podcast episode, etc.).',
    category: 'research',
    icon: 'Layout',
    status: 'beta',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
    ],
    outputs: {
      description: 'Format recommendations with reasoning and example topics',
      example: {
        recommendations: [
          { format: 'Instagram Reel', fit_score: 0.9, reason: 'Strong visual presence' },
          { format: 'Podcast Deep Dive', fit_score: 0.8, reason: 'Complex expertise' },
        ],
      },
    },
    requiresWrites: false,
    estimatedDuration: '5-10 seconds',
    tags: ['format', 'content', 'strategy'],
  },

  // ============================================
  // SCORING TOOLS
  // ============================================
  {
    id: 'scoring.score_guest',
    name: 'Score Guest',
    description:
      'Calculate a weighted score (0-100) for a guest based on POV clarity, alignment, content reuse potential, and audience leverage.',
    category: 'scoring',
    icon: 'Star',
    status: 'available',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'pov_clarity',
        label: 'POV Clarity (0-1)',
        type: 'number',
        required: true,
        description: 'How unique and clear is their perspective?',
        validation: { min: 0, max: 1 },
      },
      {
        name: 'alignment',
        label: 'Pillar Alignment (0-1)',
        type: 'number',
        required: true,
        description: 'How well do they fit Health/Wealth/Connection?',
        validation: { min: 0, max: 1 },
      },
      {
        name: 'content_reuse',
        label: 'Content Reuse Potential (0-1)',
        type: 'number',
        required: true,
        description: 'How repurposable is their content?',
        validation: { min: 0, max: 1 },
      },
      {
        name: 'audience_leverage',
        label: 'Audience Leverage (0-1)',
        type: 'number',
        required: true,
        description: 'What reach/engagement potential do they have?',
        validation: { min: 0, max: 1 },
      },
    ],
    outputs: {
      description: 'Score (0-100) with factor breakdown and explanation',
    },
    toolName: 'scoring.score_guest',
    requiresWrites: true,
    estimatedDuration: '2-5 seconds',
    tags: ['scoring', 'ranking', 'guests'],
  },
  {
    id: 'scoring.quiz_model',
    name: 'Quiz Scoring Model',
    description:
      'Score quiz inputs with sliding interdependency for CTAs that hook and engage.',
    category: 'scoring',
    icon: 'Calculator',
    status: 'coming_soon',
    parameters: [
      {
        name: 'quiz_responses',
        label: 'Quiz Responses',
        type: 'json',
        required: true,
        placeholder: '{ "q1": "answer1", "q2": "answer2" }',
      },
      {
        name: 'model_version',
        label: 'Model Version',
        type: 'select',
        required: false,
        default: 'v1',
        options: [
          { value: 'v1', label: 'Version 1 (Default)' },
          { value: 'v2_beta', label: 'Version 2 (Beta)' },
        ],
      },
    ],
    outputs: {
      description: 'Segment assignment with confidence and recommended CTAs',
    },
    requiresWrites: false,
    estimatedDuration: '1-3 seconds',
    tags: ['quiz', 'segmentation', 'scoring'],
  },
  {
    id: 'scoring.flag_collaborators',
    name: 'Flag Collaborators',
    description:
      'Identify high-potential collaborators for video content or contributor outreach.',
    category: 'scoring',
    icon: 'Flag',
    status: 'beta',
    parameters: [
      {
        name: 'min_score',
        label: 'Minimum Score Threshold',
        type: 'number',
        required: false,
        default: 70,
        validation: { min: 0, max: 100 },
      },
      {
        name: 'collaboration_type',
        label: 'Collaboration Type',
        type: 'multiselect',
        required: false,
        default: ['video', 'contributor'],
        options: [
          { value: 'video', label: 'Video Content' },
          { value: 'contributor', label: 'LifeRX Contributor' },
          { value: 'podcast', label: 'Podcast Guest' },
          { value: 'event', label: 'Event Speaker' },
        ],
      },
    ],
    outputs: {
      description: 'List of flagged guests with collaboration recommendations',
    },
    requiresWrites: true,
    estimatedDuration: '5-10 seconds',
    tags: ['collaborators', 'outreach', 'scoring'],
  },

  // ============================================
  // CONTENT TOOLS
  // ============================================
  {
    id: 'content.quote_cards',
    name: 'Quote Cards',
    description:
      'Create pre-designed quote card ideas from guest quotes.',
    category: 'content',
    icon: 'Image',
    status: 'beta',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: false,
        options: [],
        description: 'Leave empty to use all recent quotes',
      },
      {
        name: 'style',
        label: 'Visual Style',
        type: 'select',
        required: false,
        default: 'minimal',
        options: [
          { value: 'minimal', label: 'Minimal' },
          { value: 'bold', label: 'Bold' },
          { value: 'editorial', label: 'Editorial' },
        ],
      },
      {
        name: 'count',
        label: 'Number of Cards',
        type: 'number',
        required: false,
        default: 5,
        validation: { min: 1, max: 20 },
      },
    ],
    outputs: {
      description: 'Quote card designs with text, layout, and color suggestions',
    },
    requiresWrites: false,
    estimatedDuration: '10-20 seconds',
    tags: ['quotes', 'social', 'design'],
  },
  {
    id: 'content.carousel_ideas',
    name: 'Carousel Ideas',
    description:
      'Generate carousel post ideas from interview content.',
    category: 'content',
    icon: 'Layers',
    status: 'beta',
    parameters: [
      {
        name: 'interview_id',
        label: 'Interview',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'slides',
        label: 'Number of Slides',
        type: 'number',
        required: false,
        default: 5,
        validation: { min: 3, max: 10 },
      },
      {
        name: 'tone',
        label: 'Tone',
        type: 'select',
        required: false,
        default: 'educational',
        options: [
          { value: 'educational', label: 'Educational' },
          { value: 'inspirational', label: 'Inspirational' },
          { value: 'tactical', label: 'Tactical' },
        ],
      },
    ],
    outputs: {
      description: 'Carousel structure with slide content and hook',
    },
    requiresWrites: false,
    estimatedDuration: '15-30 seconds',
    tags: ['carousel', 'social', 'content'],
  },
  {
    id: 'content.video_scripts',
    name: 'Video Scripts',
    description:
      'Suggest shortform video scripts or audio bites from interview content.',
    category: 'content',
    icon: 'Video',
    status: 'beta',
    parameters: [
      {
        name: 'interview_id',
        label: 'Interview',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'duration',
        label: 'Target Duration',
        type: 'select',
        required: false,
        default: '30s',
        options: [
          { value: '15s', label: '15 seconds' },
          { value: '30s', label: '30 seconds' },
          { value: '60s', label: '60 seconds' },
        ],
      },
      {
        name: 'count',
        label: 'Number of Scripts',
        type: 'number',
        required: false,
        default: 3,
        validation: { min: 1, max: 10 },
      },
    ],
    outputs: {
      description: 'Video script ideas with hook, body, and CTA',
    },
    requiresWrites: false,
    estimatedDuration: '15-30 seconds',
    tags: ['video', 'scripts', 'shortform'],
  },
  {
    id: 'content.post_topics',
    name: 'Post Topics',
    description:
      'Generate 3-5 post topics from a guest\'s answers, tied to Health/Wealth/Connection + emotional insight.',
    category: 'content',
    icon: 'Lightbulb',
    status: 'available',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'count',
        label: 'Number of Topics',
        type: 'number',
        required: false,
        default: 5,
        validation: { min: 3, max: 10 },
      },
    ],
    outputs: {
      description: 'Post topics with pillar mapping and emotional angle',
    },
    requiresWrites: false,
    estimatedDuration: '10-20 seconds',
    tags: ['topics', 'content', 'strategy'],
  },
  {
    id: 'content.group_themes',
    name: 'Group Themes',
    description:
      'Identify themes that can be grouped across multiple guests (e.g., "Habits of Fulfilled Founders").',
    category: 'content',
    icon: 'FolderKanban',
    status: 'beta',
    parameters: [
      {
        name: 'min_guests',
        label: 'Minimum Guests per Theme',
        type: 'number',
        required: false,
        default: 3,
        validation: { min: 2, max: 10 },
      },
    ],
    outputs: {
      description: 'Grouped themes with guest lists and content angles',
    },
    requiresWrites: false,
    estimatedDuration: '20-40 seconds',
    tags: ['themes', 'grouping', 'series'],
  },
  {
    id: 'content.mini_series',
    name: 'Mini Series',
    description:
      'Automatically group guests that could form a mini series or highlight reel.',
    category: 'content',
    icon: 'ListVideo',
    status: 'coming_soon',
    parameters: [
      {
        name: 'series_length',
        label: 'Series Length',
        type: 'select',
        required: false,
        default: '3-5',
        options: [
          { value: '3-5', label: '3-5 Episodes' },
          { value: '5-7', label: '5-7 Episodes' },
          { value: '7-10', label: '7-10 Episodes' },
        ],
      },
      {
        name: 'theme_focus',
        label: 'Theme Focus',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'Auto-detect' },
          { value: 'health', label: 'Health' },
          { value: 'wealth', label: 'Wealth' },
          { value: 'connection', label: 'Connection' },
        ],
      },
    ],
    outputs: {
      description: 'Series proposals with episode structure and guests',
    },
    requiresWrites: false,
    estimatedDuration: '30-60 seconds',
    tags: ['series', 'content', 'planning'],
  },

  // ============================================
  // COMMUNICATION TOOLS
  // ============================================
  {
    id: 'outreach.post_release',
    name: 'Post-Release Communication',
    description:
      'Send follow-up communication to guests after podcast/article release.',
    category: 'communication',
    icon: 'Send',
    status: 'available',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'content_type',
        label: 'Content Type',
        type: 'select',
        required: true,
        options: [
          { value: 'podcast', label: 'Podcast Episode' },
          { value: 'article', label: 'Article' },
          { value: 'video', label: 'Video' },
        ],
      },
      {
        name: 'content_url',
        label: 'Content URL',
        type: 'string',
        required: true,
        placeholder: 'https://...',
      },
      {
        name: 'include_social_kit',
        label: 'Include Social Kit',
        type: 'boolean',
        required: false,
        default: true,
      },
    ],
    outputs: {
      description: 'Draft message with shareable assets',
    },
    toolName: 'outreach.log_event',
    requiresWrites: true,
    estimatedDuration: '5-10 seconds',
    tags: ['outreach', 'follow-up', 'communication'],
  },
  {
    id: 'outreach.connection_request',
    name: 'Connection Request',
    description:
      'Generate and send connection requests to potential guests.',
    category: 'communication',
    icon: 'UserPlus',
    status: 'coming_soon',
    parameters: [
      {
        name: 'profile_url',
        label: 'Profile URL',
        type: 'string',
        required: true,
        placeholder: 'https://linkedin.com/in/...',
      },
      {
        name: 'personalization_level',
        label: 'Personalization',
        type: 'select',
        required: false,
        default: 'medium',
        options: [
          { value: 'low', label: 'Low (Template)' },
          { value: 'medium', label: 'Medium (Semi-personalized)' },
          { value: 'high', label: 'High (Fully personalized)' },
        ],
      },
    ],
    outputs: {
      description: 'Connection request message',
    },
    requiresWrites: true,
    estimatedDuration: '10-20 seconds',
    tags: ['outreach', 'connection', 'linkedin'],
  },
  {
    id: 'outreach.video_ask',
    name: 'Video Content Ask',
    description:
      'Create personalized asks for video content using guest\'s previous responses.',
    category: 'communication',
    icon: 'VideoIcon',
    status: 'beta',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'video_type',
        label: 'Video Type',
        type: 'select',
        required: true,
        options: [
          { value: 'short_tip', label: 'Short Tip (15-30s)' },
          { value: 'story', label: 'Personal Story (1-2 min)' },
          { value: 'advice', label: 'Advice Clip (30-60s)' },
        ],
      },
    ],
    outputs: {
      description: 'Personalized video request with suggested topics',
    },
    requiresWrites: true,
    estimatedDuration: '10-15 seconds',
    tags: ['video', 'outreach', 'content'],
  },
  {
    id: 'outreach.contributor_invite',
    name: 'Contributor Invite',
    description:
      'Auto-generate personalized contributor invitation emails based on interview content.',
    category: 'communication',
    icon: 'Mail',
    status: 'available',
    parameters: [
      {
        name: 'guest_id',
        label: 'Guest',
        type: 'select',
        required: true,
        options: [],
      },
      {
        name: 'contribution_type',
        label: 'Contribution Type',
        type: 'multiselect',
        required: false,
        default: ['video', 'article'],
        options: [
          { value: 'video', label: 'Video Content' },
          { value: 'article', label: 'Written Article' },
          { value: 'podcast', label: 'Podcast Appearance' },
          { value: 'workshop', label: 'Workshop/Webinar' },
        ],
      },
    ],
    outputs: {
      description: 'Personalized invitation email with relevant quotes and suggestions',
    },
    requiresWrites: true,
    estimatedDuration: '10-20 seconds',
    tags: ['invitation', 'contributor', 'outreach'],
  },
  {
    id: 'followups.manage',
    name: 'Manage Follow-ups',
    description:
      'Track responses and manage follow-up tasks for outreach.',
    category: 'communication',
    icon: 'CheckSquare',
    status: 'available',
    parameters: [
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        required: true,
        options: [
          { value: 'list', label: 'List Pending Follow-ups' },
          { value: 'create', label: 'Create Follow-up' },
          { value: 'complete', label: 'Mark as Complete' },
        ],
      },
      {
        name: 'guest_id',
        label: 'Guest (for create/complete)',
        type: 'select',
        required: false,
        options: [],
      },
      {
        name: 'due_date',
        label: 'Due Date (for create)',
        type: 'date',
        required: false,
      },
      {
        name: 'note',
        label: 'Note',
        type: 'textarea',
        required: false,
        placeholder: 'Add context for this follow-up...',
      },
    ],
    outputs: {
      description: 'Follow-up status or created task details',
    },
    toolName: 'followups.create',
    requiresWrites: true,
    estimatedDuration: '2-5 seconds',
    tags: ['follow-up', 'tasks', 'tracking'],
  },

  // ============================================
  // ANALYTICS TOOLS
  // ============================================
  {
    id: 'analytics.audience_segments',
    name: 'Audience Segments',
    description:
      'Analyze and segment your audience based on engagement patterns.',
    category: 'analytics',
    icon: 'Users',
    status: 'coming_soon',
    parameters: [
      {
        name: 'segment_by',
        label: 'Segment By',
        type: 'multiselect',
        required: false,
        default: ['engagement', 'pillar'],
        options: [
          { value: 'engagement', label: 'Engagement Level' },
          { value: 'pillar', label: 'Pillar Interest' },
          { value: 'content_type', label: 'Content Type Preference' },
          { value: 'recency', label: 'Recency' },
        ],
      },
    ],
    outputs: {
      description: 'Segment breakdown with size, characteristics, and recommendations',
    },
    requiresWrites: false,
    estimatedDuration: '20-40 seconds',
    tags: ['segmentation', 'audience', 'analytics'],
  },
  {
    id: 'analytics.query_interviews',
    name: 'Query Interviews',
    description:
      'Search interviews by topic, tone, pillar, or emotional valence.',
    category: 'analytics',
    icon: 'Search',
    status: 'available',
    parameters: [
      {
        name: 'query',
        label: 'Search Query',
        type: 'string',
        required: false,
        placeholder: 'e.g., "redefining success" or "morning routines"',
      },
      {
        name: 'pillar',
        label: 'Pillar',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'All Pillars' },
          { value: 'health', label: 'Health' },
          { value: 'wealth', label: 'Wealth' },
          { value: 'connection', label: 'Connection' },
        ],
      },
      {
        name: 'tone',
        label: 'Tone',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'Any Tone' },
          { value: 'inspiring', label: 'Inspiring' },
          { value: 'tactical', label: 'Tactical' },
          { value: 'reflective', label: 'Reflective' },
        ],
      },
      {
        name: 'limit',
        label: 'Max Results',
        type: 'number',
        required: false,
        default: 20,
        validation: { min: 1, max: 100 },
      },
    ],
    outputs: {
      description: 'Matching interviews with relevance scores',
    },
    requiresWrites: false,
    estimatedDuration: '5-10 seconds',
    tags: ['search', 'interviews', 'query'],
  },
];

export const TOOL_CATALOG: ToolCatalog = {
  categories: CATEGORIES,
  tools: TOOLS,
};

// Helper functions
export function getToolsByCategory(category: ToolCategory): CatalogTool[] {
  return TOOLS.filter((tool) => tool.category === category);
}

export function getToolById(id: string): CatalogTool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

export function getAvailableTools(): CatalogTool[] {
  return TOOLS.filter((tool) => tool.status === 'available');
}

export function searchTools(query: string): CatalogTool[] {
  const lowerQuery = query.toLowerCase();
  return TOOLS.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
