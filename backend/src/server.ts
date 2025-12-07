// backend/src/server.ts
// Express server setup with all middleware and routes

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createLogger } from './config/logger';
import { env, NetworkMode } from './config/env';
import { RPCClientWrapper } from './rpc/client';
import { AgreementService } from './services/agreementService';
import { OracleService } from './services/oracleService';
import { RPCService } from './services/rpcService';
import { createAgreementRoutes } from './routes/agreements';
import { createWebhookRoutes } from './routes/webhooks';
import { createHealthRoutes } from './routes/health';
import { createStatsRoutes } from './routes/stats';

const logger = createLogger('server');

export interface AppContext {
  prisma: PrismaClient;
  rpcWrapper: RPCClientWrapper;
  agreementService: AgreementService;
  oracleService: OracleService;
  rpcService: RPCService;
}

export async function createServer(): Promise<{ app: Application; context: AppContext }> {
  const app = express();

  // Initialize Prisma
  const prisma = new PrismaClient();
  await prisma.$connect();
  logger.info('Connected to database');

  // ---------------------------------------------------------------------------
  // Qubic RPC bootstrap
  // ---------------------------------------------------------------------------
  const rpcWrapper = new RPCClientWrapper(env.RPC_URL, env.NETWORK_MODE);

  // Effective mode we’ll expose to the rest of the app
  let effectiveMode: NetworkMode | 'DEMO_OFFCHAIN' = env.NETWORK_MODE;

  // If we are in “demo/off-chain” mode, we deliberately DO NOT try to
  // initialize any RPC – this avoids the crash you were seeing.
  if (env.DEMO_MODE || env.NETWORK_MODE === 'DEMO_OFFCHAIN') {
    effectiveMode = 'DEMO_OFFCHAIN';
    logger.info(
      {
        networkMode: env.NETWORK_MODE,
        demoMode: env.DEMO_MODE,
      },
      'DEMO_OFFCHAIN / DEMO_MODE enabled – skipping RPC initialization and running fully off-chain',
    );
  } else {
    // Non-demo path: only call initialize if it actually exists
    const maybeRpc: any = rpcWrapper as any;

    if (maybeRpc && typeof maybeRpc.initialize === 'function') {
      try {
        await maybeRpc.initialize();
        effectiveMode = env.NETWORK_MODE;
        logger.info(
          { mode: effectiveMode },
          `RPC initialized successfully, running in ${effectiveMode} mode`,
        );
      } catch (err) {
        logger.error(
          {
            errorName: (err as Error).name,
            errorMessage: (err as Error).message,
          },
          'RPC initialization failed – falling back to DEMO_OFFCHAIN mode',
        );
        effectiveMode = 'DEMO_OFFCHAIN';
      }
    } else {
      logger.warn(
        'RPCClientWrapper.initialize() not found – skipping RPC bootstrap and running in DEMO_OFFCHAIN mode',
      );
      effectiveMode = 'DEMO_OFFCHAIN';
    }
  }

  // Initialize services
  const agreementService = new AgreementService(prisma, rpcWrapper);
  const oracleService = new OracleService(prisma, agreementService);
  const rpcService = new RPCService(prisma, rpcWrapper);

  const context: AppContext = {
    prisma,
    rpcWrapper,
    agreementService,
    oracleService,
    rpcService,
  };

  // Middleware
  app.use(
    cors({
      origin: env.CORS_ORIGIN ?? env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request');
    next();
  });

  // Attach context to request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).context = context;
    next();
  });

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  // Stats FIRST so it wins /api/agreements/stats/summary
  app.use('/api/agreements/stats', createStatsRoutes(context));

  // Core agreement routes
  app.use('/api/agreements', createAgreementRoutes(context));

  // Webhooks & health
  app.use('/api/webhooks', createWebhookRoutes(context));
  app.use('/api/health', createHealthRoutes(context));

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Pronexma Protocol',
      version: '1.0.0',
      description: 'Milestone-Based Settlement Layer for Qubic/Nostromo',
      mode: effectiveMode,
      docs: '/api/health',
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    });
  });

  return { app, context };
}

export async function startServer(): Promise<void> {
  try {
    const { app, context } = await createServer();

    const server = app.listen(env.PORT, () => {
      // Safe logging of mode even if rpcWrapper doesn’t implement shouldUseDemoMode
      let mode: string = env.NETWORK_MODE;
      try {
        const maybeRpc: any = context?.rpcWrapper;
        if (maybeRpc && typeof maybeRpc.shouldUseDemoMode === 'function' && maybeRpc.shouldUseDemoMode()) {
          mode = 'DEMO_OFFCHAIN';
        }
      } catch {
        // ignore – we just fall back to env.NETWORK_MODE
      }

      logger.info(`Pronexma backend running on port ${env.PORT}`);
      logger.info(`Network mode: ${mode}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down backend gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    const err = error as any;

    // Force the real error to appear in your terminal
    console.error('SERVER_STARTUP_ERROR >>>', err);

    logger.error(
      {
        errorName: err?.name,
        errorMessage: err?.message,
        errorStack: err?.stack,
      },
      'Failed to start server',
    );

    process.exit(1);
  }
}

