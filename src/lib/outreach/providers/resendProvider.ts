/**
 * Resend Email Provider
 * 
 * Implementation of EmailProvider using Resend SDK.
 * Requires RESEND_API_KEY and OUTREACH_FROM_EMAIL environment variables.
 */

import { Resend } from 'resend';
import type { EmailProvider, EmailSendInput, EmailSendResult } from './emailProvider';
import { EmailSendError } from './emailProvider';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OUTREACH_FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL;

/**
 * Lazily initialized Resend client
 */
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new EmailSendError(
      'RESEND_API_KEY environment variable is not configured',
      'resend',
      'auth'
    );
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }

  return resendClient;
}

function getFromEmail(): string {
  if (!OUTREACH_FROM_EMAIL) {
    throw new EmailSendError(
      'OUTREACH_FROM_EMAIL environment variable is not configured',
      'resend',
      'auth'
    );
  }

  return OUTREACH_FROM_EMAIL;
}

/**
 * Resend provider implementation
 */
export const resendProvider: EmailProvider = {
  name: 'resend',

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const client = getResendClient();
    const from = getFromEmail();

    try {
      const result = await client.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });

      if (result.error) {
        // Categorize Resend errors
        let category: 'auth' | 'recipient' | 'content' | 'rate_limit' | 'unknown' = 'unknown';
        const errorMessage = result.error.message || 'Unknown Resend error';

        if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
          category = 'auth';
        } else if (errorMessage.includes('recipient') || errorMessage.includes('email address')) {
          category = 'recipient';
        } else if (errorMessage.includes('content') || errorMessage.includes('body')) {
          category = 'content';
        } else if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
          category = 'rate_limit';
        }

        throw new EmailSendError(
          errorMessage,
          'resend',
          category,
          result.error
        );
      }

      if (!result.data?.id) {
        throw new EmailSendError(
          'Resend did not return a message ID',
          'resend',
          'unknown'
        );
      }

      return {
        provider_message_id: result.data.id,
      };

    } catch (error) {
      // Re-throw EmailSendError as-is
      if (error instanceof EmailSendError) {
        throw error;
      }

      // Wrap other errors
      throw new EmailSendError(
        error instanceof Error ? error.message : 'Unknown error sending email',
        'resend',
        'unknown',
        error
      );
    }
  },
};

