// backend/src/tests/agreementService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AgreementService } from '../services/agreementService';
import { RPCClientWrapper } from '../rpc/client';
import { NetworkMode } from '../config/env';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    agreement: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    milestone: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockPrisma)),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('AgreementService', () => {
  let service: AgreementService;
  let mockPrisma: any;
  let mockRpcWrapper: RPCClientWrapper;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    mockRpcWrapper = {
      shouldUseDemoMode: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue(null),
    } as any;
    
    service = new AgreementService(mockPrisma, mockRpcWrapper);
  });

  describe('createAgreement', () => {
    it('should create an agreement with milestones', async () => {
      const input = {
        title: 'Test Agreement',
        description: 'A test agreement for milestone-based settlement',
        payerAddress: 'PAYER_ADDRESS_123',
        beneficiaryAddress: 'BENEFICIARY_ADDRESS_456',
        oracleAdminAddress: 'ORACLE_ADDRESS_789',
        totalAmount: '100000',
        timeoutDays: 30,
        milestones: [
          { title: 'Alpha Release', description: 'Ship alpha', amount: '50000', verificationSource: 'MANUAL' },
          { title: 'Beta Release', description: 'Ship beta', amount: '50000', verificationSource: 'GITHUB' },
        ],
      };

      const mockAgreement = {
        id: 'AG-123',
        ...input,
        lockedAmount: '0',
        releasedAmount: '0',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        timeoutAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        milestones: input.milestones.map((m, i) => ({
          id: `MS-${i + 1}`,
          ...m,
          index: i,
          state: 'PENDING',
          evidenceHash: null,
          verifiedAt: null,
          releasedAt: null,
        })),
      };

      mockPrisma.agreement.create.mockResolvedValue(mockAgreement);

      const result = await service.createAgreement(input);

      expect(result).toBeDefined();
      expect(result.state).toBe('PENDING');
      expect(mockPrisma.agreement.create).toHaveBeenCalled();
    });

    it('should fail if milestones do not sum to total', async () => {
      const input = {
        title: 'Test Agreement',
        description: 'Invalid milestones',
        payerAddress: 'PAYER_ADDRESS_123',
        beneficiaryAddress: 'BENEFICIARY_ADDRESS_456',
        oracleAdminAddress: 'ORACLE_ADDRESS_789',
        totalAmount: '100000',
        timeoutDays: 30,
        milestones: [
          { title: 'Alpha', description: 'Ship alpha', amount: '30000', verificationSource: 'MANUAL' },
          { title: 'Beta', description: 'Ship beta', amount: '30000', verificationSource: 'MANUAL' },
        ],
      };

      await expect(service.createAgreement(input)).rejects.toThrow('sum to total amount');
    });
  });

  describe('deposit', () => {
    it('should update agreement state to FUNDED on deposit', async () => {
      const agreementId = 'AG-123';
      const amount = '100000';

      const mockAgreement = {
        id: agreementId,
        state: 'PENDING',
        totalAmount: amount,
        lockedAmount: '0',
        payerAddress: 'PAYER_123',
        beneficiaryAddress: 'BENEFICIARY_456',
      };

      mockPrisma.agreement.findUnique.mockResolvedValue(mockAgreement);
      mockPrisma.agreement.update.mockResolvedValue({
        ...mockAgreement,
        state: 'FUNDED',
        lockedAmount: amount,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'TX-1',
        type: 'DEPOSIT',
        amount,
        status: 'CONFIRMED',
      });

      const result = await service.deposit(agreementId, amount);

      expect(result.agreement.state).toBe('FUNDED');
      expect(result.agreement.lockedAmount).toBe(amount);
    });

    it('should fail if agreement is not in PENDING state', async () => {
      mockPrisma.agreement.findUnique.mockResolvedValue({
        id: 'AG-123',
        state: 'ACTIVE',
        totalAmount: '100000',
      });

      await expect(service.deposit('AG-123', '100000')).rejects.toThrow('PENDING');
    });
  });

  describe('verifyMilestone', () => {
    it('should mark milestone as VERIFIED and update agreement to ACTIVE', async () => {
      const mockAgreement = {
        id: 'AG-123',
        state: 'FUNDED',
        milestones: [
          { id: 'MS-1', state: 'PENDING', amount: '50000' },
          { id: 'MS-2', state: 'PENDING', amount: '50000' },
        ],
      };

      mockPrisma.agreement.findUnique.mockResolvedValue(mockAgreement);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockAgreement.milestones[0]);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockAgreement.milestones[0],
        state: 'VERIFIED',
        evidenceHash: 'hash123',
        verifiedAt: new Date(),
      });
      mockPrisma.agreement.update.mockResolvedValue({
        ...mockAgreement,
        state: 'ACTIVE',
      });

      const result = await service.verifyMilestone('AG-123', 'MS-1', 'hash123');

      expect(result.state).toBe('VERIFIED');
      expect(mockPrisma.agreement.update).toHaveBeenCalled();
    });
  });

  describe('releaseMilestone', () => {
    it('should release funds for verified milestone', async () => {
      const mockAgreement = {
        id: 'AG-123',
        state: 'ACTIVE',
        totalAmount: '100000',
        lockedAmount: '100000',
        releasedAmount: '0',
        beneficiaryAddress: 'BENEFICIARY_456',
        milestones: [
          { id: 'MS-1', state: 'VERIFIED', amount: '50000' },
          { id: 'MS-2', state: 'PENDING', amount: '50000' },
        ],
      };

      mockPrisma.agreement.findUnique.mockResolvedValue(mockAgreement);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockAgreement.milestones[0]);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockAgreement.milestones[0],
        state: 'RELEASED',
        releasedAt: new Date(),
      });
      mockPrisma.agreement.update.mockResolvedValue({
        ...mockAgreement,
        lockedAmount: '50000',
        releasedAmount: '50000',
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'TX-2',
        type: 'RELEASE',
        amount: '49750', // After 0.5% fee
        status: 'CONFIRMED',
      });

      const result = await service.releaseMilestone('AG-123', 'MS-1');

      expect(result.milestone.state).toBe('RELEASED');
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });

    it('should mark agreement as COMPLETED when all milestones released', async () => {
      const mockAgreement = {
        id: 'AG-123',
        state: 'ACTIVE',
        totalAmount: '100000',
        lockedAmount: '50000',
        releasedAmount: '50000',
        beneficiaryAddress: 'BENEFICIARY_456',
        milestones: [
          { id: 'MS-1', state: 'RELEASED', amount: '50000' },
          { id: 'MS-2', state: 'VERIFIED', amount: '50000' },
        ],
      };

      mockPrisma.agreement.findUnique.mockResolvedValue(mockAgreement);
      mockPrisma.milestone.findUnique.mockResolvedValue(mockAgreement.milestones[1]);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockAgreement.milestones[1],
        state: 'RELEASED',
      });
      mockPrisma.agreement.update.mockResolvedValue({
        ...mockAgreement,
        state: 'COMPLETED',
        lockedAmount: '0',
        releasedAmount: '100000',
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'TX-3',
        type: 'RELEASE',
        amount: '49750',
        status: 'CONFIRMED',
      });

      const result = await service.releaseMilestone('AG-123', 'MS-2');

      expect(mockPrisma.agreement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            state: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('refund', () => {
    it('should refund remaining locked amount to payer', async () => {
      const mockAgreement = {
        id: 'AG-123',
        state: 'ACTIVE',
        totalAmount: '100000',
        lockedAmount: '50000',
        releasedAmount: '50000',
        payerAddress: 'PAYER_123',
        timeoutAt: new Date(Date.now() - 1000), // Expired
        milestones: [
          { id: 'MS-1', state: 'RELEASED', amount: '50000' },
          { id: 'MS-2', state: 'PENDING', amount: '50000' },
        ],
      };

      mockPrisma.agreement.findUnique.mockResolvedValue(mockAgreement);
      mockPrisma.milestone.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.agreement.update.mockResolvedValue({
        ...mockAgreement,
        state: 'REFUNDED',
        lockedAmount: '0',
      });
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'TX-4',
        type: 'REFUND',
        amount: '50000',
        status: 'CONFIRMED',
      });

      const result = await service.refund('AG-123');

      expect(result.agreement.state).toBe('REFUNDED');
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'REFUND',
            amount: '50000',
          }),
        })
      );
    });
  });
});
