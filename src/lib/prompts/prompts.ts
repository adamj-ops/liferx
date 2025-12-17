/**
 * Prompt Library Catalog
 *
 * All available prompts organized by category.
 */

import type { CategoryInfo, Prompt, PromptCategory, PromptCatalog } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'research',
    name: 'Research',
    icon: 'Search',
    description: 'Discover insights about guests, trends, and themes',
  },
  {
    id: 'scoring',
    name: 'Scoring',
    icon: 'BarChart3',
    description: 'Rate and rank guests and opportunities',
  },
  {
    id: 'content',
    name: 'Content',
    icon: 'FileText',
    description: 'Generate content ideas and formats',
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: 'MessageSquare',
    description: 'Outreach and follow-up messaging',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'PieChart',
    description: 'Analyze data and surface patterns',
  },
];

export const PROMPTS: Prompt[] = [
  // Research Prompts
  {
    id: 'research.guest_bio',
    name: 'Generate Guest Bio',
    description: 'Create a comprehensive bio for a podcast guest',
    category: 'research',
    icon: 'User',
    template: 'Generate a comprehensive bio for {guest_name}. Include their background, expertise, notable achievements, and why they would be a great podcast guest.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['guest', 'bio', 'profile'],
  },
  {
    id: 'research.scrape_profile',
    name: 'Research Guest Profile',
    description: 'Deep dive into a potential guest\'s online presence',
    category: 'research',
    icon: 'Search',
    template: 'Research {guest_name} across LinkedIn, their podcast appearances, and company info. Summarize their expertise, talking points, and audience relevance.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., John Doe' },
    ],
    tags: ['research', 'profile', 'linkedin'],
  },
  {
    id: 'research.identify_themes',
    name: 'Identify Interview Themes',
    description: 'Find recurring themes across multiple interviews',
    category: 'research',
    icon: 'Layers',
    template: 'Analyze our recent interviews and identify the top recurring themes. What topics resonate most with our audience?',
    tags: ['themes', 'analysis', 'interviews'],
  },
  {
    id: 'research.trending_topics',
    name: 'Find Trending Topics',
    description: 'Discover what topics are trending in our space',
    category: 'research',
    icon: 'TrendingUp',
    template: 'What health and wellness topics are trending right now that would resonate with our audience? Consider recent research, news, and social discussions.',
    tags: ['trends', 'topics', 'discovery'],
  },
  {
    id: 'research.extract_quotes',
    name: 'Extract Key Quotes',
    description: 'Pull the most impactful quotes from an interview',
    category: 'research',
    icon: 'Quote',
    template: 'Review the interview with {guest_name} and extract the top 5 most quotable moments. Focus on insights that would resonate on social media.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['quotes', 'interview', 'content'],
  },
  {
    id: 'research.suggest_format',
    name: 'Suggest Content Format',
    description: 'Recommend the best content format for a guest',
    category: 'research',
    icon: 'Layout',
    template: 'Based on {guest_name}\'s expertise and communication style, what content formats would work best? Consider video, podcast, written articles, social clips, etc.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., John Doe' },
    ],
    tags: ['format', 'content', 'strategy'],
  },

  // Scoring Prompts
  {
    id: 'scoring.score_guest',
    name: 'Score Guest Fit',
    description: 'Rate a potential guest on key criteria',
    category: 'scoring',
    icon: 'Star',
    template: 'Score {guest_name} as a potential podcast guest. Rate them on: audience relevance (1-10), expertise depth (1-10), social reach (1-10), and content potential (1-10). Explain each score.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['scoring', 'guest', 'evaluation'],
  },
  {
    id: 'scoring.rank_prospects',
    name: 'Rank Guest Prospects',
    description: 'Compare and rank multiple potential guests',
    category: 'scoring',
    icon: 'ListOrdered',
    template: 'Compare and rank these potential guests for our next interview: {guest_list}. Consider audience fit, availability likelihood, and content value.',
    variables: [
      { name: 'guest_list', label: 'Guest Names', placeholder: 'e.g., Dr. Jane Smith, John Doe, Sarah Johnson' },
    ],
    tags: ['ranking', 'comparison', 'prospects'],
  },
  {
    id: 'scoring.flag_collaborators',
    name: 'Flag Top Collaborators',
    description: 'Identify high-potential collaboration opportunities',
    category: 'scoring',
    icon: 'Flag',
    template: 'Review our guest database and flag the top 5 guests who would be best for deeper collaboration (co-branded content, series, partnerships). Explain why each is a good fit.',
    tags: ['collaboration', 'partnerships', 'opportunities'],
  },

  // Content Prompts
  {
    id: 'content.quote_cards',
    name: 'Create Quote Cards',
    description: 'Generate social media quote card ideas',
    category: 'content',
    icon: 'Image',
    template: 'Create 5 quote card concepts from {guest_name}\'s interview. For each, provide: the quote, suggested visual style, and best platform (Instagram, LinkedIn, Twitter).',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['social', 'quotes', 'visual'],
  },
  {
    id: 'content.carousel_ideas',
    name: 'Generate Carousel Ideas',
    description: 'Create Instagram/LinkedIn carousel concepts',
    category: 'content',
    icon: 'Layers',
    template: 'Generate 3 carousel post ideas based on {topic}. For each, outline the slide-by-slide content and a compelling hook for slide 1.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., gut health myths' },
    ],
    tags: ['carousel', 'social', 'instagram'],
  },
  {
    id: 'content.video_scripts',
    name: 'Write Video Scripts',
    description: 'Create short-form video scripts',
    category: 'content',
    icon: 'Video',
    template: 'Write 3 short-form video scripts (30-60 seconds each) about {topic}. Include hook, main content, and call-to-action for each.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., morning routines' },
    ],
    tags: ['video', 'scripts', 'reels'],
  },
  {
    id: 'content.post_topics',
    name: 'Generate Post Topics',
    description: 'Brainstorm content topics for a guest',
    category: 'content',
    icon: 'Lightbulb',
    template: 'Generate 5 content post topics based on {guest_name}\'s interview. Mix educational, entertaining, and engagement-focused ideas.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['topics', 'brainstorm', 'content'],
  },
  {
    id: 'content.mini_series',
    name: 'Plan Mini Series',
    description: 'Group guests into themed series',
    category: 'content',
    icon: 'Folder',
    template: 'Looking at our guest roster, suggest 3 mini-series concepts that group related guests together. For each series, name it, list suggested guests, and explain the theme.',
    tags: ['series', 'planning', 'strategy'],
  },
  {
    id: 'content.newsletter_sop',
    name: 'Newsletter SOP',
    description: 'Get the standard operating procedure for newsletters',
    category: 'content',
    icon: 'FileText',
    template: 'Show me the newsletter SOP. What are the key steps, timelines, and best practices for creating and sending our newsletters?',
    tags: ['newsletter', 'sop', 'process'],
  },

  // Communication Prompts
  {
    id: 'communication.outreach_email',
    name: 'Draft Outreach Email',
    description: 'Create a personalized guest outreach email',
    category: 'communication',
    icon: 'Mail',
    template: 'Draft a personalized outreach email to {guest_name} inviting them to be a guest on our podcast. Reference their work on {topic} and explain why they\'d be a great fit.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
      { name: 'topic', label: 'Their Topic/Work', placeholder: 'e.g., longevity research' },
    ],
    tags: ['outreach', 'email', 'invitation'],
  },
  {
    id: 'communication.follow_up',
    name: 'Write Follow-Up',
    description: 'Create a follow-up message for non-responders',
    category: 'communication',
    icon: 'RefreshCw',
    template: 'Write a friendly follow-up message to {guest_name} who hasn\'t responded to our initial outreach. Keep it brief, add value, and include a clear next step.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['followup', 'outreach', 'persistence'],
  },
  {
    id: 'communication.post_release',
    name: 'Post-Release Message',
    description: 'Thank a guest after episode release',
    category: 'communication',
    icon: 'Heart',
    template: 'Draft a thank you message to {guest_name} now that their episode is live. Include key metrics if available and suggest ways to collaborate on promotion.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['thankyou', 'post-release', 'engagement'],
  },
  {
    id: 'communication.connection_request',
    name: 'LinkedIn Connection',
    description: 'Write a LinkedIn connection request',
    category: 'communication',
    icon: 'UserPlus',
    template: 'Write a LinkedIn connection request message to {guest_name}. Make it personal, mention why we\'d like to connect, and keep it under 300 characters.',
    variables: [
      { name: 'guest_name', label: 'Guest Name', placeholder: 'e.g., Dr. Jane Smith' },
    ],
    tags: ['linkedin', 'connection', 'networking'],
  },

  // Analytics Prompts
  {
    id: 'analytics.top_guests',
    name: 'Identify Top Guests',
    description: 'Find our highest-performing guests',
    category: 'analytics',
    icon: 'Trophy',
    template: 'Who are our top performing guests based on engagement, reach, and audience feedback? List the top 5 and explain what made them successful.',
    tags: ['performance', 'guests', 'analysis'],
  },
  {
    id: 'analytics.audience_segments',
    name: 'Analyze Audience',
    description: 'Segment and understand our audience',
    category: 'analytics',
    icon: 'Users',
    template: 'Analyze our audience and identify the key segments. What are their interests, pain points, and what content resonates most with each segment?',
    tags: ['audience', 'segments', 'analysis'],
  },
  {
    id: 'analytics.query_interviews',
    name: 'Query Interviews',
    description: 'Search interviews by topic or theme',
    category: 'analytics',
    icon: 'Database',
    template: 'Search our interview database for content about {topic}. Summarize the key insights and which guests discussed this topic.',
    variables: [
      { name: 'topic', label: 'Topic', placeholder: 'e.g., sleep optimization' },
    ],
    tags: ['search', 'interviews', 'topics'],
  },
  {
    id: 'analytics.outreach_pipeline',
    name: 'Review Pipeline',
    description: 'Check the status of outreach efforts',
    category: 'analytics',
    icon: 'GitBranch',
    template: 'Review our current outreach pipeline. How many prospects are in each stage? Who needs follow-up? What\'s our response rate?',
    tags: ['pipeline', 'outreach', 'status'],
  },
];

export const PROMPT_CATALOG: PromptCatalog = {
  categories: CATEGORIES,
  prompts: PROMPTS,
};

// Helper functions
export function getPromptsByCategory(category: PromptCategory): Prompt[] {
  return PROMPTS.filter((p) => p.category === category);
}

export function getPromptById(id: string): Prompt | undefined {
  return PROMPTS.find((p) => p.id === id);
}

export function searchPrompts(query: string): Prompt[] {
  const lower = query.toLowerCase();
  return PROMPTS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags?.some((t) => t.toLowerCase().includes(lower))
  );
}

export function getCategoryInfo(category: PromptCategory): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.id === category);
}
