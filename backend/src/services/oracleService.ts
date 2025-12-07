// backend/src/services/oracleService.ts
// Oracle Service - Handles external event verification and milestone triggering

import { PrismaClient } from '@prisma/client';

// TypeScript enums (stored as strings in SQLite)
enum WebhookStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

enum MilestoneState {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AgreementService } from './agreementService.js';
import { oracleLogger as logger } from '../config/logger.js';
import { config } from '../config/env.js';

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookPayload {
  agreementId: string;
  milestoneId: string;
  source: string;
  event: string;
  evidence: Record<string, unknown>;
  signature?: string;
}

export interface VerificationResult {
  accepted: boolean;
  reason?: string;
  evidenceHash?: string;
}

// Source-specific event types
export interface GitHubPREvent {
  repo: string;
  pr: number;
  commit: string;
  merged: boolean;
  author: string;
}

export interface JiraTicketEvent {
  project: string;
  ticket: string;
  status: string;
  assignee: string;
}

export interface InvoiceEvent {
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class OracleService {
  private prisma: PrismaClient;
  private agreementService: AgreementService;
  private allowedSources: Set<string>;

  constructor(prisma: PrismaClient, agreementService: AgreementService) {
    this.prisma = prisma;
    this.agreementService = agreementService;
    this.allowedSources = new Set(config.WEBHOOK_ALLOWED_SOURCES.split(','));
  }

  // ===========================================================================
  // WEBHOOK PROCESSING
  // ===========================================================================

  async processWebhook(payload: WebhookPayload): Promise<{
    eventId: string;
    result: VerificationResult;
    milestoneTriggered: boolean;
  }> {
    logger.info('Processing webhook', {
      agreementId: payload.agreementId,
      milestoneId: payload.milestoneId,
      source: payload.source,
      event: payload.event,
    });

    // Validate source
    if (!this.allowedSources.has(payload.source)) {
      logger.warn('Unknown webhook source', { source: payload.source });
      throw new Error(`Unknown source: ${payload.source}`);
    }

    // Create webhook event record
    const event = await this.prisma.webhookEvent.create({
      data: {
        id: uuidv4(),
        agreementId: payload.agreementId,
        milestoneId: payload.milestoneId,
        source: payload.source,
        eventType: payload.event,
        payload: JSON.stringify(payload.evidence),
        signature: payload.signature || null,
        status: WebhookStatus.PROCESSING,
      },
    });

    try {
      // Verify the event
      const result = await this.verifyEvent(payload);

      if (result.accepted) {
        // Trigger milestone verification
        await this.agreementService.verifyMilestone(
          payload.agreementId,
          payload.milestoneId,
          result.evidenceHash!,
          payload.evidence
        );

        // Update webhook event
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: WebhookStatus.PROCESSED,
            processedAt: new Date(),
            milestoneTriggered: true,
          },
        });

        logger.info('Webhook processed, milestone triggered', {
          eventId: event.id,
          evidenceHash: result.evidenceHash,
        });

        return {
          eventId: event.id,
          result,
          milestoneTriggered: true,
        };
      } else {
        // Event not accepted
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            status: WebhookStatus.IGNORED,
            processedAt: new Date(),
            errorMessage: result.reason,
            milestoneTriggered: false,
          },
        });

        logger.info('Webhook ignored', {
          eventId: event.id,
          reason: result.reason,
        });

        return {
          eventId: event.id,
          result,
          milestoneTriggered: false,
        };
      }
    } catch (error) {
      const errorMessage = (error as Error).message;

      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookStatus.FAILED,
          processedAt: new Date(),
          errorMessage,
        },
      });

      logger.error('Webhook processing failed', {
        eventId: event.id,
        error: errorMessage,
      });

      throw error;
    }
  }

  // ===========================================================================
  // EVENT VERIFICATION
  // ===========================================================================

  async verifyEvent(payload: WebhookPayload): Promise<VerificationResult> {
    // Get the milestone to check verification source
    const agreement = await this.agreementService.getAgreement(payload.agreementId);
    if (!agreement) {
      return { accepted: false, reason: 'Agreement not found' };
    }

    const milestone = agreement.milestones.find((m) => m.id === payload.milestoneId);
    if (!milestone) {
      return { accepted: false, reason: 'Milestone not found' };
    }

    if (milestone.state !== MilestoneState.PENDING) {
      return { accepted: false, reason: `Milestone is ${milestone.state}, not PENDING` };
    }

    // Source-specific verification
    switch (payload.source) {
      case 'github':
        return this.verifyGitHubEvent(payload.event, payload.evidence as unknown as GitHubPREvent);
      case 'gitlab':
        return this.verifyGitLabEvent(payload.event, payload.evidence);
      case 'jira':
        return this.verifyJiraEvent(payload.event, payload.evidence as unknown as JiraTicketEvent);
      case 'invoice':
        return this.verifyInvoiceEvent(payload.event, payload.evidence as unknown as InvoiceEvent);
      case 'manual':
      case 'zapier':
        return this.verifyManualEvent(payload.event, payload.evidence);
      default:
        return { accepted: false, reason: `Unsupported source: ${payload.source}` };
    }
  }

  private async verifyGitHubEvent(
    event: string,
    evidence: GitHubPREvent
  ): Promise<VerificationResult> {
    logger.debug('Verifying GitHub event', { event, evidence });

    // In production, this would verify against GitHub API
    // For now, we accept if basic fields are present

    if (event === 'pr_merged') {
      if (!evidence.repo || !evidence.pr || !evidence.commit) {
        return { accepted: false, reason: 'Missing required GitHub fields' };
      }

      if (!evidence.merged) {
        return { accepted: false, reason: 'PR not merged' };
      }

      const evidenceHash = this.hashEvidence({
        type: 'github_pr',
        repo: evidence.repo,
        pr: evidence.pr,
        commit: evidence.commit,
      });

      return { accepted: true, evidenceHash };
    }

    return { accepted: false, reason: `Unknown GitHub event: ${event}` };
  }

  private async verifyGitLabEvent(
    event: string,
    evidence: Record<string, unknown>
  ): Promise<VerificationResult> {
    logger.debug('Verifying GitLab event', { event, evidence });

    if (event === 'mr_merged') {
      if (!evidence.project || !evidence.mr || !evidence.commit) {
        return { accepted: false, reason: 'Missing required GitLab fields' };
      }

      const evidenceHash = this.hashEvidence({
        type: 'gitlab_mr',
        ...evidence,
      });

      return { accepted: true, evidenceHash };
    }

    return { accepted: false, reason: `Unknown GitLab event: ${event}` };
  }

  private async verifyJiraEvent(
    event: string,
    evidence: JiraTicketEvent
  ): Promise<VerificationResult> {
    logger.debug('Verifying Jira event', { event, evidence });

    if (event === 'ticket_completed') {
      if (!evidence.project || !evidence.ticket) {
        return { accepted: false, reason: 'Missing required Jira fields' };
      }

      // Check if status indicates completion
      const completedStatuses = ['done', 'closed', 'resolved', 'complete'];
      if (!completedStatuses.includes(evidence.status.toLowerCase())) {
        return { accepted: false, reason: `Ticket status is ${evidence.status}, not completed` };
      }

      const evidenceHash = this.hashEvidence({
        type: 'jira_ticket',
        project: evidence.project,
        ticket: evidence.ticket,
        status: evidence.status,
      });

      return { accepted: true, evidenceHash };
    }

    return { accepted: false, reason: `Unknown Jira event: ${event}` };
  }

  private async verifyInvoiceEvent(
    event: string,
    evidence: InvoiceEvent
  ): Promise<VerificationResult> {
    logger.debug('Verifying invoice event', { event, evidence });

    if (event === 'invoice_paid') {
      if (!evidence.invoiceId || !evidence.status) {
        return { accepted: false, reason: 'Missing required invoice fields' };
      }

      const paidStatuses = ['paid', 'settled', 'complete'];
      if (!paidStatuses.includes(evidence.status.toLowerCase())) {
        return { accepted: false, reason: `Invoice status is ${evidence.status}, not paid` };
      }

      const evidenceHash = this.hashEvidence({
        type: 'invoice',
        invoiceId: evidence.invoiceId,
        amount: evidence.amount,
        currency: evidence.currency,
        paidAt: evidence.paidAt,
      });

      return { accepted: true, evidenceHash };
    }

    return { accepted: false, reason: `Unknown invoice event: ${event}` };
  }

  private async verifyManualEvent(
    event: string,
    evidence: Record<string, unknown>
  ): Promise<VerificationResult> {
    logger.debug('Verifying manual event', { event, evidence });

    // Manual events are always accepted (for demo/admin purposes)
    // In production, you might require additional authentication

    if (event === 'manual_approval' || event === 'admin_trigger') {
      const evidenceHash = this.hashEvidence({
        type: 'manual',
        event,
        timestamp: new Date().toISOString(),
        ...evidence,
      });

      return { accepted: true, evidenceHash };
    }

    return { accepted: false, reason: `Unknown manual event: ${event}` };
  }

  // ===========================================================================
  // SIGNATURE VERIFICATION
  // ===========================================================================

  verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ===========================================================================
  // MANUAL TRIGGER (FOR DEMO/ADMIN)
  // ===========================================================================

  async manualTrigger(
    agreementId: string,
    milestoneId: string,
    reason: string = 'Manual trigger'
  ): Promise<{
    eventId: string;
    result: VerificationResult;
    milestoneTriggered: boolean;
  }> {
    logger.info('Manual milestone trigger', { agreementId, milestoneId, reason });

    return this.processWebhook({
      agreementId,
      milestoneId,
      source: 'manual',
      event: 'admin_trigger',
      evidence: {
        reason,
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'admin',
      },
    });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private hashEvidence(evidence: Record<string, unknown>): string {
    const sorted = JSON.stringify(evidence, Object.keys(evidence).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }

  // ===========================================================================
  // WEBHOOK EVENT QUERIES
  // ===========================================================================

  async getWebhookEvents(
    agreementId: string,
    options: { limit?: number; status?: WebhookStatus } = {}
  ) {
    const { limit = 50, status } = options;

    return this.prisma.webhookEvent.findMany({
      where: {
        agreementId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
