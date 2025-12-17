/**
 * Email Provider Interface
 * 
 * Abstraction for email sending providers.
 * Allows swapping providers (Resend, SendGrid, Postmark) without code changes.
 */

export interface EmailSendInput {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML body content */
  html: string;
  /** Optional plain text body */
  text?: string;
  /** Optional reply-to address */
  replyTo?: string;
}

export interface EmailSendResult {
  /** Provider-specific message ID for tracking */
  provider_message_id: string;
}

export interface EmailProvider {
  /** Provider name for logging */
  name: string;
  
  /**
   * Send an email
   * @param input Email details
   * @returns Result with provider message ID
   * @throws Error if sending fails
   */
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

/**
 * Email send error with provider context
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly category: 'auth' | 'recipient' | 'content' | 'rate_limit' | 'unknown',
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

