// backend/src/config/env.ts
// Centralised config loader for Pronexma backend

import 'dotenv/config';

export type NetworkMode = 'LOCAL_DEV' | 'PUBLIC_TESTNET' | 'DEMO_OFFCHAIN';

export interface Config {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  RPC_URL: string;
  NETWORK_MODE: NetworkMode;
  DEMO_MODE: boolean;

  ORACLE_PRIVATE_KEY: string;
  ORACLE_ADDRESS: string;

  WEBHOOK_SECRET: string;
  WEBHOOK_ALLOWED_SOURCES: string;

  DEMO_WALLET_ORACLE: string;
  PROTOCOL_FEE_BPS: number;
  MAX_MILESTONES: number;

  FRONTEND_URL: string;
  LOG_LEVEL: string;
  
}

const cfg: Config = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? '4000'),
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./pronexma.db',

  // Qubic RPC (not used in DEMO_OFFCHAIN, but wired for later)
  RPC_URL: process.env.RPC_URL ?? 'http://localhost:8080',
  NETWORK_MODE: (process.env.NETWORK_MODE ?? 'DEMO_OFFCHAIN') as NetworkMode,
  DEMO_MODE: (process.env.DEMO_MODE ?? 'true') === 'true',

  ORACLE_PRIVATE_KEY: process.env.ORACLE_PRIVATE_KEY ?? 'demo-key',
  // Optional – for real on-chain oracle accounts later
  ORACLE_ADDRESS: process.env.ORACLE_ADDRESS ?? '',

  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ?? 'dev-secret',
  WEBHOOK_ALLOWED_SOURCES:
    process.env.WEBHOOK_ALLOWED_SOURCES ??
    'github,gitlab,jira,invoice,manual,zapier',

  DEMO_WALLET_ORACLE: process.env.DEMO_WALLET_ORACLE ?? 'oracle-demo',

  // 50 bps = 0.50% protocol fee by default
  PROTOCOL_FEE_BPS: Number(process.env.PROTOCOL_FEE_BPS ?? '50'),

  // Max milestones per agreement (soft limit)
  MAX_MILESTONES: Number(process.env.MAX_MILESTONES ?? '10'),

  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  LOG_LEVEL: process.env.LOG_LEVEL ?? 'debug',

};

// Preferred export
export const config = cfg;

// Backwards-compat alias so `import { env }` keeps working
export const env = cfg;

