// backend/src/routes/health.ts
// Health check / status endpoint for Pronexma backend

import { Router, Request, Response } from 'express';
import { AppContext } from '../server';
import { createLogger } from '../config/logger';
import { env } from '../config/env';

const logger = createLogger('health');

export function createHealthRoutes(context: AppContext) {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      // --- DB check ----------------------------------------------------------
      let dbStatus: 'ok' | 'error' = 'ok';

      try {
        // Cheap check to ensure the DB connection is alive
        // NOTE: For SQLite, use $queryRaw (not $executeRaw) when expecting rows.
        await context.prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        dbStatus = 'error';
        logger.error(
          {
            errorName: (err as Error).name,
            errorMessage: (err as Error).message,
          },
          'Database health check failed',
        );
      }

      // --- RPC check (if not in pure demo mode) ------------------------------
      let rpcStatus: 'ok' | 'unavailable' | 'demo' = 'demo';

      const anyRpc: any = context.rpcWrapper;

      if (env.DEMO_MODE || env.NETWORK_MODE === 'DEMO_OFFCHAIN') {
        rpcStatus = 'demo';
      } else if (anyRpc && typeof anyRpc.healthCheck === 'function') {
        try {
          const ok = await anyRpc.healthCheck();
          rpcStatus = ok ? 'ok' : 'unavailable';
        } catch (err) {
          rpcStatus = 'unavailable';
          logger.warn(
            {
              errorName: (err as Error).name,
              errorMessage: (err as Error).message,
            },
            'RPC health check failed',
          );
        }
      } else {
        rpcStatus = 'unavailable';
      }

      // --- Effective mode ----------------------------------------------------
      let mode = env.NETWORK_MODE;
      try {
        if (
          anyRpc &&
          typeof anyRpc.shouldUseDemoMode === 'function' &&
          anyRpc.shouldUseDemoMode()
        ) {
          mode = 'DEMO_OFFCHAIN';
        }
      } catch {
        // ignore, we'll just use env.NETWORK_MODE
      }

      // Respond with health summary
      res.json({
        status: dbStatus === 'ok' ? 'ok' : 'degraded',
        mode,
        db: dbStatus,
        rpc: rpcStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Final catch so this route NEVER throws up to Express
      const error = err as Error;
      logger.error(
        {
          errorName: error.name,
          errorMessage: error.message,
        },
        'Health endpoint crashed',
      );

      // Important: no throwing/rejecting here → avoids UNHANDLED_REJECTION
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  });

  return router;
}
