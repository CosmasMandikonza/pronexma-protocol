// backend/src/routes/webhooks.ts
// Webhook API Routes - Receives external events from GitHub, Jira, etc.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OracleService, WebhookPayload } from '../services/oracleService.js';
import { webhookLogger as logger } from '../config/logger.js';
import { config } from '../config/env.js';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const webhookPayloadSchema = z.object({
  agreementId: z.string().min(1),
  milestoneId: z.string().min(1),
  source: z.string().min(1),
  event: z.string().min(1),
  evidence: z.record(z.unknown()),
  signature: z.string().optional(),
});

// =============================================================================
// ROUTE FACTORY
// =============================================================================

export function createWebhookRoutes(oracleService: OracleService): Router {
  const router = Router();

  // ===========================================================================
  // POST /api/webhooks/milestone - Generic milestone webhook
  // ===========================================================================

  router.post('/milestone', async (req: Request, res: Response) => {
    try {
      logger.info('Received webhook', {
        source: req.body.source,
        event: req.body.event,
      });

      const payload = webhookPayloadSchema.parse(req.body) as WebhookPayload;

      // Verify signature if provided
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      if (signature) {
        const isValid = oracleService.verifySignature(JSON.stringify(req.body), signature);
        if (!isValid) {
          logger.warn('Invalid webhook signature');
          res.status(401).json({
            success: false,
            error: 'Invalid signature',
          });
          return;
        }
      }

      const result = await oracleService.processWebhook(payload);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid webhook payload', { errors: error.errors });
        res.status(400).json({
          success: false,
          error: 'Invalid payload',
          details: error.errors,
        });
        return;
      }

      logger.error('Webhook processing failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/webhooks/github - GitHub-specific webhook
  // ===========================================================================

  router.post('/github', async (req: Request, res: Response) => {
    try {
      const githubEvent = req.headers['x-github-event'] as string;
      logger.info('Received GitHub webhook', { event: githubEvent });

      // Verify GitHub signature
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      if (signature && config.WEBHOOK_SECRET) {
        // GitHub uses sha256=<signature> format
        const expectedSig = signature.replace('sha256=', '');
        const isValid = oracleService.verifySignature(JSON.stringify(req.body), expectedSig);
        if (!isValid) {
          logger.warn('Invalid GitHub signature');
          res.status(401).json({ success: false, error: 'Invalid signature' });
          return;
        }
      }

      // Map GitHub events to our webhook format
      if (githubEvent === 'pull_request' && req.body.action === 'closed' && req.body.pull_request?.merged) {
        const pr = req.body.pull_request;

        // Extract agreement/milestone from PR body or labels
        const agreementMatch = pr.body?.match(/agreement:\s*([^\s]+)/i);
        const milestoneMatch = pr.body?.match(/milestone:\s*([^\s]+)/i);

        if (!agreementMatch || !milestoneMatch) {
          logger.info('GitHub PR merged but no agreement/milestone specified');
          res.json({
            success: true,
            data: { ignored: true, reason: 'No agreement/milestone in PR body' },
          });
          return;
        }

        const payload: WebhookPayload = {
          agreementId: agreementMatch[1],
          milestoneId: milestoneMatch[1],
          source: 'github',
          event: 'pr_merged',
          evidence: {
            repo: req.body.repository?.full_name,
            pr: pr.number,
            commit: pr.merge_commit_sha,
            merged: true,
            author: pr.user?.login,
            title: pr.title,
            url: pr.html_url,
          },
        };

        const result = await oracleService.processWebhook(payload);
        res.json({ success: true, data: result });
      } else {
        res.json({
          success: true,
          data: { ignored: true, reason: `Unhandled event: ${githubEvent}` },
        });
      }
    } catch (error) {
      logger.error('GitHub webhook failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/webhooks/zapier - Zapier/Make webhook (simple format)
  // ===========================================================================

  router.post('/zapier', async (req: Request, res: Response) => {
    try {
      logger.info('Received Zapier webhook');

      const { agreement_id, milestone_id, trigger_reason, ...extraData } = req.body;

      if (!agreement_id || !milestone_id) {
        res.status(400).json({
          success: false,
          error: 'agreement_id and milestone_id are required',
        });
        return;
      }

      const payload: WebhookPayload = {
        agreementId: agreement_id,
        milestoneId: milestone_id,
        source: 'zapier',
        event: 'automation_trigger',
        evidence: {
          reason: trigger_reason || 'Zapier automation trigger',
          ...extraData,
          triggeredAt: new Date().toISOString(),
        },
      };

      const result = await oracleService.processWebhook(payload);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Zapier webhook failed', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // GET /api/webhooks/events/:agreementId - Get webhook events for agreement
  // ===========================================================================

  router.get('/events/:agreementId', async (req: Request, res: Response) => {
    try {
      const { agreementId } = req.params;
      const events = await oracleService.getWebhookEvents(agreementId);

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error('Failed to get webhook events', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  return router;
}
