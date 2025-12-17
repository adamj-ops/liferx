/**
 * Tool: outreach.send_email
 * Sends a queued email message via Resend.
 */

import { ToolDefinition, ToolContext, ToolResponse } from '../types';
import { createServiceClient } from '../../supabase/server';
import { resendProvider, EmailSendError } from '../../outreach/providers';
import { executeTool } from '../executeTool';

interface SendEmailArgs {
  message_id: string;
}

const DEFAULT_FOLLOWUP_DAYS = 7;

export const outreachSendEmail: ToolDefinition<SendEmailArgs> = {
  name: 'outreach.send_email',
  description: 'Send a queued outreach email via Resend provider',
  version: '1.0.0',

  async execute(args: SendEmailArgs, context: ToolContext): Promise<ToolResponse> {
    const supabase = createServiceClient();

    // 1. Check write permission
    if (!context.allowWrites) {
      return {
        success: false,
        error: {
          code: 'WRITE_NOT_ALLOWED',
          message: 'Write operations are not permitted in this context',
        },
      };
    }

    // 2. Validate input
    if (!args.message_id) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'message_id is required' },
      };
    }

    // 3. Fetch message with thread
    const { data: message, error: fetchError } = await supabase
      .from('outreach_messages')
      .select('id, org_id, thread_id, channel, status, subject, body, personalization')
      .eq('id', args.message_id)
      .single();

    if (fetchError || !message) {
      return {
        success: false,
        error: { code: 'MESSAGE_NOT_FOUND', message: `Message ${args.message_id} not found` },
      };
    }

    // 4. Verify org ownership
    if (message.org_id !== context.org_id) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Message does not belong to this organization' },
      };
    }

    // 5. Validate channel is email
    if (message.channel !== 'email') {
      return {
        success: false,
        error: { 
          code: 'INVALID_CHANNEL', 
          message: `Cannot send email for channel '${message.channel}'. Channel must be 'email'.` 
        },
      };
    }

    // 6. Validate status is queued
    if (message.status !== 'queued') {
      return {
        success: false,
        error: { 
          code: 'INVALID_STATE', 
          message: `Cannot send message with status '${message.status}'. Status must be 'queued'.` 
        },
      };
    }

    // 7. Resolve recipient email
    let recipientEmail: string | null = null;
    let recipientResolution = 'unknown';

    // Try personalization first
    const personalization = message.personalization as Record<string, unknown> | null;
    if (personalization?.email) {
      recipientEmail = personalization.email as string;
      recipientResolution = 'personalization.email';
    } else if (personalization?.to) {
      recipientEmail = personalization.to as string;
      recipientResolution = 'personalization.to';
    }

    // Fall back to guest email via thread
    if (!recipientEmail && message.thread_id) {
      const { data: thread } = await supabase
        .from('outreach_threads')
        .select('guest_id')
        .eq('id', message.thread_id)
        .single();

      if (thread?.guest_id) {
        const { data: guest } = await supabase
          .from('guests')
          .select('email')
          .eq('id', thread.guest_id)
          .single();

        if (guest?.email) {
          recipientEmail = guest.email;
          recipientResolution = 'guest.email';
        }
      }
    }

    if (!recipientEmail) {
      return {
        success: false,
        error: { 
          code: 'NO_RECIPIENT', 
          message: 'Cannot send email: no recipient email found in personalization or guest record.' 
        },
      };
    }

    // 8. Validate email content
    if (!message.subject) {
      return {
        success: false,
        error: { code: 'NO_SUBJECT', message: 'Email subject is required' },
      };
    }

    if (!message.body) {
      return {
        success: false,
        error: { code: 'NO_BODY', message: 'Email body is required' },
      };
    }

    // 9. Attempt to send via Resend
    const now = new Date();
    const nowIso = now.toISOString();
    let providerMessageId: string | null = null;

    try {
      const result = await resendProvider.send({
        to: recipientEmail,
        subject: message.subject,
        html: message.body, // Assuming body is HTML; could enhance to generate from markdown
        text: message.body.replace(/<[^>]*>/g, ''), // Basic HTML stripping for text version
      });

      providerMessageId = result.provider_message_id;

    } catch (error) {
      // Update message status to failed
      await supabase
        .from('outreach_messages')
        .update({ status: 'failed' })
        .eq('id', args.message_id);

      const errorMessage = error instanceof EmailSendError 
        ? error.message 
        : (error instanceof Error ? error.message : 'Unknown error');

      const errorCategory = error instanceof EmailSendError 
        ? error.category 
        : 'unknown';

      return {
        success: false,
        error: { 
          code: 'SEND_FAILED', 
          message: `Failed to send email: ${errorMessage}` 
        },
        explainability: {
          action: 'send_failed',
          provider: 'resend',
          error_category: errorCategory,
          recipient: recipientEmail,
          recipient_resolution: recipientResolution,
        },
      };
    }

    // 10. Update message status to sent
    const { error: updateMessageError } = await supabase
      .from('outreach_messages')
      .update({ 
        status: 'sent',
        sent_at: nowIso,
        provider_message_id: providerMessageId,
      })
      .eq('id', args.message_id);

    if (updateMessageError) {
      console.warn('[outreach.send_email] Failed to update message:', updateMessageError.message);
    }

    // 11. Update thread state
    let followupId: string | null = null;
    const followupDate = new Date(now.getTime() + DEFAULT_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000);

    if (message.thread_id) {
      const { error: updateThreadError } = await supabase
        .from('outreach_threads')
        .update({ 
          state: 'sent',
          last_event_at: nowIso,
          next_followup_at: followupDate.toISOString(),
          updated_at: nowIso,
        })
        .eq('id', message.thread_id);

      if (updateThreadError) {
        console.warn('[outreach.send_email] Failed to update thread:', updateThreadError.message);
      }

      // Create followup
      const followupResult = await executeTool('followups.create_for_thread', {
        thread_id: message.thread_id,
        due_at: followupDate.toISOString(),
        reason: 'Scheduled follow-up after email sent',
      }, context);

      if (followupResult.success && followupResult.data) {
        followupId = (followupResult.data as { followup_id: string }).followup_id;
      }
    }

    return {
      success: true,
      data: { 
        ok: true,
        provider_message_id: providerMessageId,
      },
      explainability: {
        action: 'email_sent',
        provider: 'resend',
        message_id: args.message_id,
        thread_id: message.thread_id,
        recipient: recipientEmail,
        recipient_resolution: recipientResolution,
        provider_message_id: providerMessageId,
        sent_at: nowIso,
        followup_scheduled_for: followupDate.toISOString(),
        followup_id: followupId,
        followup_days: DEFAULT_FOLLOWUP_DAYS,
      },
      writes: [
        {
          table: 'outreach_messages',
          operation: 'update',
          id: args.message_id,
        },
        ...(message.thread_id ? [{
          table: 'outreach_threads' as const,
          operation: 'update' as const,
          id: message.thread_id,
        }] : []),
        ...(followupId ? [{
          table: 'followups' as const,
          operation: 'insert' as const,
          id: followupId,
        }] : []),
      ],
    };
  },
};

