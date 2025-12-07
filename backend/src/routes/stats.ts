// backend/src/routes/stats.ts
import { Router, Request, Response } from 'express';
import type { AppContext } from '../server';
import { createLogger } from '../config/logger';

const logger = createLogger('stats');

// Very small, very safe stats route.
// It always returns a 200 with sane defaults so the frontend never breaks.
export function createStatsRoutes(_context: AppContext) {
  const router = Router();

  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      // If later you want to make this real, you can use _context.prisma here
      // to sum active agreements. For now we keep it “unbreakable”.
      const payload = {
        success: true,
        totalValueLocked: '0',     // string because the frontend expects a string
        activeAgreements: 0,       // number
        verifiedSources: 4,        // GitHub, GitLab, Jira, Invoices
      };

      res.json(payload);
    } catch (err) {
      logger.error({ err }, 'Failed to handle stats summary');
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  });

  return router;
}
