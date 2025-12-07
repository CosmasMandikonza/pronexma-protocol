// backend/src/services/agreementService.ts
// Agreement Service - Core business logic for managing escrow agreements

import { PrismaClient } from '@prisma/client';

// TypeScript enums (stored as strings in SQLite)
export enum AgreementState {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

export enum MilestoneState {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  RELEASE = 'RELEASE',
  REFUND = 'REFUND',
  FEE = 'FEE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
import { v4 as uuidv4 } from 'uuid';
import { rpcWrapper, RPCError } from '../rpc/client.js';
import { agreementLogger as logger } from '../config/logger.js';
import { config } from '../config/env.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAgreementInput {
  payerAddress: string;
  beneficiaryAddress: string;
  totalAmount: bigint;
  title: string;
  description?: string;
  tags?: string[];
  milestones: {
    title: string;
    description?: string;
    amount: bigint;
    verificationSource?: string;
  }[];
}

export interface AgreementWithMilestones {
  id: string;
  onChainId: string | null;
  payerAddress: string;
  beneficiaryAddress: string;
  oracleAdminAddress: string;
  totalAmount: bigint;
  lockedAmount: bigint;
  releasedAmount: bigint;
  state: AgreementState;
  title: string;
  description: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  fundedAt: Date | null;
  completedAt: Date | null;
  timeoutAt: Date | null;
  milestones: {
    id: string;
    sequenceNumber: number;
    amount: bigint;
    state: MilestoneState;
    title: string;
    description: string | null;
    verificationSource: string | null;
    verifiedAt: Date | null;
    releasedAt: Date | null;
    evidenceHash: string | null;
  }[];
  transactions: {
    id: string;
    type: TransactionType;
    txHash: string | null;
    amount: bigint;
    status: TransactionStatus;
    createdAt: Date;
    confirmedAt: Date | null;
  }[];
}

export interface AgreementListFilter {
  payerAddress?: string;
  beneficiaryAddress?: string;
  state?: AgreementState;
  role?: 'payer' | 'beneficiary' | 'oracle' | 'all';
  walletAddress?: string;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class AgreementService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ===========================================================================
  // CREATE AGREEMENT
  // ===========================================================================

  async createAgreement(input: CreateAgreementInput): Promise<AgreementWithMilestones> {
    logger.info('Creating agreement', { title: input.title, payer: input.payerAddress });

    // Validate milestones sum
    const milestoneTotal = input.milestones.reduce((sum, m) => sum + m.amount, 0n);
    if (milestoneTotal !== input.totalAmount) {
      throw new Error(`Milestone amounts (${milestoneTotal}) must equal total amount (${input.totalAmount})`);
    }

    if (input.milestones.length > config.MAX_MILESTONES) {
      throw new Error(`Maximum ${config.MAX_MILESTONES} milestones allowed`);
    }

    // Check if we should use demo mode
    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let onChainId: string | null = null;

    // Create agreement on-chain (or simulate)
    if (!useDemoMode) {
      try {
        const result = await rpcWrapper.getClient().createAgreement({
          beneficiary: input.beneficiaryAddress,
          oracleAdmin: config.ORACLE_ADDRESS || config.DEMO_WALLET_ORACLE,
          totalAmount: input.totalAmount,
          milestoneAmounts: input.milestones.map((m) => m.amount),
          title: input.title,
          from: input.payerAddress,
        });
        onChainId = result.agreementId;
        logger.info('Agreement created on-chain', { onChainId, txHash: result.txHash });
      } catch (error) {
        if (error instanceof RPCError && error.shouldFallback) {
          logger.warn('RPC failed, continuing in demo mode', { error: error.message });
        } else {
          throw error;
        }
      }
    } else {
      // Generate simulated on-chain ID for demo mode
      onChainId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
      logger.info('Demo mode: simulated on-chain ID', { onChainId });
    }

    // Create agreement in database
    const agreement = await this.prisma.agreement.create({
      data: {
        id: uuidv4(),
        onChainId,
        payerAddress: input.payerAddress,
        beneficiaryAddress: input.beneficiaryAddress,
        oracleAdminAddress: config.ORACLE_ADDRESS || config.DEMO_WALLET_ORACLE,
        totalAmount: input.totalAmount,
        lockedAmount: 0n,
        releasedAmount: 0n,
        state: AgreementState.CREATED,
        title: input.title,
        description: input.description || null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        milestones: {
          create: input.milestones.map((m, index) => ({
            id: uuidv4(),
            sequenceNumber: index + 1,
            amount: m.amount,
            state: MilestoneState.PENDING,
            title: m.title,
            description: m.description || null,
            verificationSource: m.verificationSource || 'manual',
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    logger.info('Agreement created', { id: agreement.id, onChainId: agreement.onChainId });

    return this.formatAgreement(agreement);
  }

  // ===========================================================================
  // GET AGREEMENT
  // ===========================================================================

  async getAgreement(id: string): Promise<AgreementWithMilestones | null> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agreement) {
      return null;
    }

    return this.formatAgreement(agreement);
  }

  // ===========================================================================
  // LIST AGREEMENTS
  // ===========================================================================

  async listAgreements(filter: AgreementListFilter = {}): Promise<AgreementWithMilestones[]> {
    const where: Record<string, unknown> = {};

    if (filter.state) {
      where.state = filter.state;
    }

    // Handle role-based filtering
    if (filter.role && filter.walletAddress) {
      const address = filter.walletAddress;
      switch (filter.role) {
        case 'payer':
          where.payerAddress = address;
          break;
        case 'beneficiary':
          where.beneficiaryAddress = address;
          break;
        case 'oracle':
          where.oracleAdminAddress = address;
          break;
        case 'all':
          where.OR = [
            { payerAddress: address },
            { beneficiaryAddress: address },
            { oracleAdminAddress: address },
          ];
          break;
      }
    } else {
      if (filter.payerAddress) {
        where.payerAddress = filter.payerAddress;
      }
      if (filter.beneficiaryAddress) {
        where.beneficiaryAddress = filter.beneficiaryAddress;
      }
    }

    const agreements = await this.prisma.agreement.findMany({
      where,
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agreements.map((a) => this.formatAgreement(a));
  }

  // ===========================================================================
  // DEPOSIT
  // ===========================================================================

  async deposit(agreementId: string, amount: bigint, fromAddress: string): Promise<AgreementWithMilestones> {
    logger.info('Processing deposit', { agreementId, amount: amount.toString(), from: fromAddress });

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.state !== AgreementState.CREATED) {
      throw new Error('Agreement is not in CREATED state');
    }

    if (agreement.payerAddress !== fromAddress) {
      throw new Error('Only payer can deposit');
    }

    if (amount !== agreement.totalAmount) {
      throw new Error(`Deposit amount must equal total amount (${agreement.totalAmount})`);
    }

    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let txHash: string | null = null;

    // Process deposit on-chain or simulate
    if (!useDemoMode && agreement.onChainId) {
      try {
        const result = await rpcWrapper.getClient().deposit({
          agreementId: agreement.onChainId,
          amount,
          from: fromAddress,
        });
        txHash = result.txHash;
        logger.info('Deposit confirmed on-chain', { txHash });
      } catch (error) {
        if (error instanceof RPCError && error.shouldFallback) {
          logger.warn('RPC failed during deposit, simulating', { error: error.message });
        } else {
          throw error;
        }
      }
    }

    if (!txHash) {
      // Demo mode - generate simulated tx hash
      txHash = `0x${uuidv4().replace(/-/g, '')}`;
      logger.info('Demo mode: simulated deposit tx', { txHash });
    }

    // Update database
    const updated = await this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        state: AgreementState.FUNDED,
        lockedAmount: amount,
        fundedAt: new Date(),
        timeoutAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        transactions: {
          create: {
            id: uuidv4(),
            type: TransactionType.DEPOSIT,
            txHash,
            amount,
            status: TransactionStatus.CONFIRMED,
            fromAddress,
            toAddress: 'PRONEXMA_VAULT',
            confirmedAt: new Date(),
          },
        },
      },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    logger.info('Deposit completed', { agreementId, txHash });
    return this.formatAgreement(updated);
  }

  // ===========================================================================
  // VERIFY MILESTONE
  // ===========================================================================

  async verifyMilestone(
    agreementId: string,
    milestoneId: string,
    evidenceHash: string,
    evidenceData?: unknown
  ): Promise<AgreementWithMilestones> {
    logger.info('Verifying milestone', { agreementId, milestoneId });

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.state !== AgreementState.FUNDED && agreement.state !== AgreementState.ACTIVE) {
      throw new Error('Agreement is not in verifiable state');
    }

    const milestone = agreement.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.state !== MilestoneState.PENDING) {
      throw new Error('Milestone is not in PENDING state');
    }

    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let txHash: string | null = null;

    // Mark milestone verified on-chain or simulate
    if (!useDemoMode && agreement.onChainId) {
      try {
        const result = await rpcWrapper.getClient().markMilestoneVerified({
          agreementId: agreement.onChainId,
          milestoneId: milestone.sequenceNumber,
          evidenceHash,
          from: agreement.oracleAdminAddress,
        });
        txHash = result.txHash;
        logger.info('Milestone verified on-chain', { txHash });
      } catch (error) {
        if (error instanceof RPCError && error.shouldFallback) {
          logger.warn('RPC failed during verification, simulating', { error: error.message });
        } else {
          throw error;
        }
      }
    }

    if (!txHash) {
      txHash = `0x${uuidv4().replace(/-/g, '')}`;
      logger.info('Demo mode: simulated verification tx', { txHash });
    }

    // Update database
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        state: MilestoneState.VERIFIED,
        verifiedAt: new Date(),
        evidenceHash,
        evidenceData: evidenceData ? JSON.stringify(evidenceData) : null,
      },
    });

    // Update agreement state if first verification
    if (agreement.state === AgreementState.FUNDED) {
      await this.prisma.agreement.update({
        where: { id: agreementId },
        data: { state: AgreementState.ACTIVE },
      });
    }

    logger.info('Milestone verified', { agreementId, milestoneId, txHash });

    return this.getAgreement(agreementId) as Promise<AgreementWithMilestones>;
  }

  // ===========================================================================
  // RELEASE MILESTONE
  // ===========================================================================

  async releaseMilestone(agreementId: string, milestoneId: string): Promise<AgreementWithMilestones> {
    logger.info('Releasing milestone', { agreementId, milestoneId });

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    const milestone = agreement.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.state !== MilestoneState.VERIFIED) {
      throw new Error('Milestone must be VERIFIED before release');
    }

    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let txHash: string | null = null;

    // Release funds on-chain or simulate
    if (!useDemoMode && agreement.onChainId) {
      try {
        const result = await rpcWrapper.getClient().releaseMilestone({
          agreementId: agreement.onChainId,
          milestoneId: milestone.sequenceNumber,
          from: agreement.oracleAdminAddress,
        });
        txHash = result.txHash;
        logger.info('Milestone released on-chain', { txHash });
      } catch (error) {
        if (error instanceof RPCError && error.shouldFallback) {
          logger.warn('RPC failed during release, simulating', { error: error.message });
        } else {
          throw error;
        }
      }
    }

    if (!txHash) {
      txHash = `0x${uuidv4().replace(/-/g, '')}`;
      logger.info('Demo mode: simulated release tx', { txHash });
    }

    // Calculate fee
    const feeAmount = (milestone.amount * BigInt(config.PROTOCOL_FEE_BPS)) / 10000n;
    const releaseAmount = milestone.amount - feeAmount;

    // Update milestone
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        state: MilestoneState.RELEASED,
        releasedAt: new Date(),
      },
    });

    // Update agreement amounts
    const newReleasedAmount = agreement.releasedAmount + releaseAmount;
    const newLockedAmount = agreement.lockedAmount - milestone.amount;

    // Check if all milestones are released
    const allMilestones = await this.prisma.milestone.findMany({
      where: { agreementId },
    });
    const allReleased = allMilestones.every(
      (m) => m.id === milestoneId || m.state === MilestoneState.RELEASED
    );

    await this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        lockedAmount: newLockedAmount,
        releasedAmount: newReleasedAmount,
        state: allReleased ? AgreementState.COMPLETED : agreement.state,
        completedAt: allReleased ? new Date() : null,
        transactions: {
          create: {
            id: uuidv4(),
            type: TransactionType.RELEASE,
            txHash,
            amount: releaseAmount,
            status: TransactionStatus.CONFIRMED,
            fromAddress: 'PRONEXMA_VAULT',
            toAddress: agreement.beneficiaryAddress,
            milestoneId,
            confirmedAt: new Date(),
          },
        },
      },
    });

    logger.info('Milestone released', {
      agreementId,
      milestoneId,
      amount: releaseAmount.toString(),
      txHash,
    });

    return this.getAgreement(agreementId) as Promise<AgreementWithMilestones>;
  }

  // ===========================================================================
  // REFUND
  // ===========================================================================

  async refund(agreementId: string, fromAddress: string): Promise<AgreementWithMilestones> {
    logger.info('Processing refund', { agreementId, from: fromAddress });

    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { milestones: true },
    });

    if (!agreement) {
      throw new Error('Agreement not found');
    }

    if (agreement.payerAddress !== fromAddress) {
      throw new Error('Only payer can request refund');
    }

    if (agreement.state === AgreementState.COMPLETED || agreement.state === AgreementState.REFUNDED) {
      throw new Error('Agreement cannot be refunded');
    }

    // Check timeout (in production, this would check on-chain)
    if (agreement.timeoutAt && new Date() < agreement.timeoutAt) {
      throw new Error('Refund timeout not reached');
    }

    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let txHash: string | null = null;

    if (!useDemoMode && agreement.onChainId) {
      try {
        const result = await rpcWrapper.getClient().refund({
          agreementId: agreement.onChainId,
          from: fromAddress,
        });
        txHash = result.txHash;
      } catch (error) {
        if (error instanceof RPCError && error.shouldFallback) {
          logger.warn('RPC failed during refund, simulating', { error: error.message });
        } else {
          throw error;
        }
      }
    }

    if (!txHash) {
      txHash = `0x${uuidv4().replace(/-/g, '')}`;
    }

    const refundAmount = agreement.lockedAmount;

    // Update milestones to cancelled
    await this.prisma.milestone.updateMany({
      where: {
        agreementId,
        state: { in: [MilestoneState.PENDING, MilestoneState.VERIFIED] },
      },
      data: { state: MilestoneState.CANCELLED },
    });

    // Update agreement
    const updated = await this.prisma.agreement.update({
      where: { id: agreementId },
      data: {
        state: AgreementState.REFUNDED,
        lockedAmount: 0n,
        transactions: {
          create: {
            id: uuidv4(),
            type: TransactionType.REFUND,
            txHash,
            amount: refundAmount,
            status: TransactionStatus.CONFIRMED,
            fromAddress: 'PRONEXMA_VAULT',
            toAddress: fromAddress,
            confirmedAt: new Date(),
          },
        },
      },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    logger.info('Refund completed', { agreementId, amount: refundAmount.toString(), txHash });
    return this.formatAgreement(updated);
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getStats(): Promise<{
    totalAgreements: number;
    activeAgreements: number;
    totalValueLocked: bigint;
    totalValueReleased: bigint;
  }> {
    const [counts, sums] = await Promise.all([
      this.prisma.agreement.count(),
      this.prisma.agreement.aggregate({
        _sum: {
          lockedAmount: true,
          releasedAmount: true,
        },
        where: {
          state: { in: [AgreementState.FUNDED, AgreementState.ACTIVE] },
        },
      }),
    ]);

    const activeCount = await this.prisma.agreement.count({
      where: {
        state: { in: [AgreementState.FUNDED, AgreementState.ACTIVE] },
      },
    });

    return {
      totalAgreements: counts,
      activeAgreements: activeCount,
      totalValueLocked: sums._sum.lockedAmount || 0n,
      totalValueReleased: sums._sum.releasedAmount || 0n,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private formatAgreement(agreement: {
    id: string;
    onChainId: string | null;
    payerAddress: string;
    beneficiaryAddress: string;
    oracleAdminAddress: string;
    totalAmount: bigint;
    lockedAmount: bigint;
    releasedAmount: bigint;
    state: AgreementState;
    title: string;
    description: string | null;
    tags: string | null;
    createdAt: Date;
    updatedAt: Date;
    fundedAt: Date | null;
    completedAt: Date | null;
    timeoutAt: Date | null;
    milestones: Array<{
      id: string;
      sequenceNumber: number;
      amount: bigint;
      state: MilestoneState;
      title: string;
      description: string | null;
      verificationSource: string | null;
      verifiedAt: Date | null;
      releasedAt: Date | null;
      evidenceHash: string | null;
    }>;
    transactions: Array<{
      id: string;
      type: TransactionType;
      txHash: string | null;
      amount: bigint;
      status: TransactionStatus;
      createdAt: Date;
      confirmedAt: Date | null;
    }>;
  }): AgreementWithMilestones {
    return {
      ...agreement,
      tags: agreement.tags ? JSON.parse(agreement.tags) : null,
    };
  }
}
