// backend/src/routes/agreements.ts
// Agreement API Routes

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AgreementService, AgreementListFilter } from '../services/agreementService.js';
import { OracleService } from '../services/oracleService.js';
import { agreementLogger as logger } from '../config/logger.js';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createAgreementSchema = z.object({
  payerAddress: z.string().min(1),
  beneficiaryAddress: z.string().min(1),
  totalAmount: z.string().transform((v) => BigInt(v)),
  title: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(128),
        description: z.string().max(512).optional(),
        amount: z.string().transform((v) => BigInt(v)),
        verificationSource: z.string().optional(),
      })
    )
    .min(1)
    .max(10),
});

const depositSchema = z.object({
  amount: z.string().transform((v) => BigInt(v)),
  fromAddress: z.string().min(1),
});

const triggerMilestoneSchema = z.object({
  reason: z.string().optional(),
});

// =============================================================================
// ROUTE FACTORY
// =============================================================================

export function createAgreementRoutes(
  agreementService: AgreementService,
  oracleService: OracleService
): Router {
  const router = Router();

  // ===========================================================================
  // GET /api/agreements - List agreements
  // ===========================================================================

  router.get('/', async (req: Request, res: Response) => {
    try {
      const { role, wallet, state } = req.query;

      const filter: AgreementListFilter = {};

      if (role && typeof role === 'string') {
        filter.role = role as 'payer' | 'beneficiary' | 'oracle' | 'all';
      }

      if (wallet && typeof wallet === 'string') {
        filter.walletAddress = wallet;
      }

      if (state && typeof state === 'string') {
        filter.state = state as AgreementListFilter['state'];
      }

      const agreements = await agreementService.listAgreements(filter);

      // Convert BigInt to string for JSON serialization
      const serialized = agreements.map((a) => serializeAgreement(a));

      res.json({
        success: true,
        data: serialized,
        count: serialized.length,
      });
    } catch (error) {
      logger.error('Failed to list agreements', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/agreements - Create agreement
  // ===========================================================================

  router.post('/', async (req: Request, res: Response) => {
    try {
      const input = createAgreementSchema.parse(req.body);

      const agreement = await agreementService.createAgreement(input);

      res.status(201).json({
        success: true,
        data: serializeAgreement(agreement),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to create agreement', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // GET /api/agreements/:id - Get agreement details
  // ===========================================================================

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const agreement = await agreementService.getAgreement(id);

      if (!agreement) {
        res.status(404).json({
          success: false,
          error: 'Agreement not found',
        });
        return;
      }

      res.json({
        success: true,
        data: serializeAgreement(agreement),
      });
    } catch (error) {
      logger.error('Failed to get agreement', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/agreements/:id/deposit - Deposit funds
  // ===========================================================================

  router.post('/:id/deposit', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const input = depositSchema.parse(req.body);

      const agreement = await agreementService.deposit(id, input.amount, input.fromAddress);

      res.json({
        success: true,
        data: serializeAgreement(agreement),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      logger.error('Failed to deposit', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/agreements/:id/refund - Request refund
  // ===========================================================================

  router.post('/:id/refund', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fromAddress } = req.body;

      if (!fromAddress) {
        res.status(400).json({
          success: false,
          error: 'fromAddress is required',
        });
        return;
      }

      const agreement = await agreementService.refund(id, fromAddress);

      res.json({
        success: true,
        data: serializeAgreement(agreement),
      });
    } catch (error) {
      logger.error('Failed to refund', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/agreements/:id/milestones/:mid/trigger - Trigger milestone verification
  // ===========================================================================

  router.post('/:id/milestones/:mid/trigger', async (req: Request, res: Response) => {
    try {
      const { id, mid } = req.params;
      const input = triggerMilestoneSchema.parse(req.body);

      const result = await oracleService.manualTrigger(id, mid, input.reason);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to trigger milestone', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // POST /api/agreements/:id/milestones/:mid/release - Release milestone funds
  // ===========================================================================

  router.post('/:id/milestones/:mid/release', async (req: Request, res: Response) => {
    try {
      const { id, mid } = req.params;

      const agreement = await agreementService.releaseMilestone(id, mid);

      res.json({
        success: true,
        data: serializeAgreement(agreement),
      });
    } catch (error) {
      logger.error('Failed to release milestone', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  // ===========================================================================
  // GET /api/agreements/stats - Get protocol statistics
  // ===========================================================================

  router.get('/stats/summary', async (_req: Request, res: Response) => {
    try {
      const stats = await agreementService.getStats();

      res.json({
        success: true,
        data: {
          totalAgreements: stats.totalAgreements,
          activeAgreements: stats.activeAgreements,
          totalValueLocked: stats.totalValueLocked.toString(),
          totalValueReleased: stats.totalValueReleased.toString(),
        },
      });
    } catch (error) {
      logger.error('Failed to get stats', { error: (error as Error).message });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  return router;
}

// =============================================================================
// HELPERS
// =============================================================================

function serializeAgreement(agreement: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(agreement, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
