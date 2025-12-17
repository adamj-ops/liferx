/**
 * Background job interface placeholder.
 * 
 * This is a seam for future async agent work:
 * - Trend scanning
 * - Guest discovery
 * - Audience monitoring
 * 
 * v1: No-op implementation. Jobs are logged but not executed.
 * Future: Wire to a job queue (BullMQ, Inngest, Trigger.dev, etc.)
 */

export interface BackgroundJob {
  type: string;
  payload: unknown;
  priority?: 'low' | 'normal' | 'high';
  delay_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface EnqueueResult {
  queued: boolean;
  job_id?: string;
  message: string;
}

/**
 * Enqueue a background job for async processing.
 * 
 * v1: No-op - logs the job but does not execute.
 * This reserves the interface for future implementation.
 */
export async function enqueueBackgroundJob(job: BackgroundJob): Promise<EnqueueResult> {
  // v1: Log and return - no actual queue
  console.log('[enqueueBackgroundJob] Job received (no-op in v1):', {
    type: job.type,
    priority: job.priority || 'normal',
    delay_ms: job.delay_ms || 0,
  });

  return {
    queued: false,
    message: 'Background jobs are not yet implemented. Job logged for future reference.',
  };
}

/**
 * Batch enqueue multiple jobs.
 */
export async function enqueueBackgroundJobsBatch(jobs: BackgroundJob[]): Promise<EnqueueResult[]> {
  return Promise.all(jobs.map(enqueueBackgroundJob));
}

/**
 * Job types for type safety.
 * Add new job types here as the system evolves.
 */
export type JobType =
  | 'trend_scan'
  | 'guest_discovery'
  | 'audience_monitor'
  | 'content_generation'
  | 'outreach_followup'
  | 'score_recalculation';

/**
 * Helper to create typed jobs.
 */
export function createJob<T extends JobType>(
  type: T,
  payload: unknown,
  options?: Omit<BackgroundJob, 'type' | 'payload'>
): BackgroundJob {
  return {
    type,
    payload,
    ...options,
  };
}

