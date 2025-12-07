// backend/src/rpc/client.ts
// Qubic RPC Client Abstraction
//
// This module provides a clean interface for communicating with the Qubic node
// via the RPC bridge. It handles:
// - Connection management
// - Request/response formatting
// - Error handling and fallback to demo mode
// - Transaction signing and submission

import { config, isDemoMode, NetworkMode } from '../config/env.js';
import { rpcLogger as logger } from '../config/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TransactionRequest {
  from: string;
  to: string;
  amount: bigint;
  data?: string;
}

export interface TransactionResult {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
}

export interface WalletBalance {
  address: string;
  balance: bigint;
  nonce: number;
}

export interface ContractCallRequest {
  contractAddress: string;
  method: string;
  params: unknown[];
  from?: string;
}

export interface ContractCallResult {
  txHash?: string;
  result?: unknown;
  gasUsed?: number;
}

// Custom error for RPC failures
export class RPCError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly shouldFallback: boolean = true
  ) {
    super(message);
    this.name = 'RPCError';
  }
}

// =============================================================================
// RPC CLIENT
// =============================================================================

class QubicRPCClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor() {
    this.baseUrl = config.RPC_URL;
    this.timeout = config.RPC_TIMEOUT_MS;
    this.retryCount = config.RPC_RETRY_COUNT;
  }

  // ===========================================================================
  // HEALTH & CONNECTION
  // ===========================================================================

  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Use cached health if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isHealthy;
    }

    try {
      const response = await this.request<{ status: string }>('/status', {
        method: 'GET',
        timeout: 5000,
      });

      this.isHealthy = response.success && response.data?.status === 'ok';
      this.lastHealthCheck = now;

      if (this.isHealthy) {
        logger.info('RPC health check passed');
      } else {
        logger.warn('RPC health check failed', { response });
      }

      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      logger.warn('RPC unreachable', { error: (error as Error).message });
      return false;
    }
  }

  isConnected(): boolean {
    return this.isHealthy;
  }

  // ===========================================================================
  // CORE REQUEST METHOD
  // ===========================================================================

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      body?: unknown;
      timeout?: number;
    } = {}
  ): Promise<RPCResponse<T>> {
    const { method = 'POST', body, timeout = this.timeout } = options;
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new RPCError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR');
      }

      const data = await response.json();
      return { success: true, data: data as T };
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new RPCError('Request timeout', 'TIMEOUT');
      }

      if (error instanceof RPCError) {
        throw error;
      }

      throw new RPCError(
        `RPC request failed: ${(error as Error).message}`,
        'NETWORK_ERROR'
      );
    }
  }

  private async requestWithRetry<T>(
    endpoint: string,
    options: { method?: 'GET' | 'POST'; body?: unknown } = {}
  ): Promise<RPCResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`RPC request attempt ${attempt}/${this.retryCount} failed`, {
          endpoint,
          error: lastError.message,
        });

        if (attempt < this.retryCount) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError || new RPCError('All retry attempts failed');
  }

  // ===========================================================================
  // WALLET OPERATIONS
  // ===========================================================================

  async getBalance(address: string): Promise<WalletBalance> {
    logger.debug('Getting balance', { address });

    const response = await this.requestWithRetry<WalletBalance>('/wallet/balance', {
      body: { address },
    });

    if (!response.success || !response.data) {
      throw new RPCError('Failed to get balance');
    }

    return response.data;
  }

  // ===========================================================================
  // TRANSACTION OPERATIONS
  // ===========================================================================

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResult> {
    logger.info('Sending transaction', {
      from: tx.from,
      to: tx.to,
      amount: tx.amount.toString(),
    });

    const response = await this.requestWithRetry<TransactionResult>('/transaction/send', {
      body: {
        from: tx.from,
        to: tx.to,
        amount: tx.amount.toString(),
        data: tx.data,
      },
    });

    if (!response.success || !response.data) {
      throw new RPCError('Failed to send transaction');
    }

    logger.info('Transaction sent', { txHash: response.data.txHash });
    return response.data;
  }

  async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    const response = await this.requestWithRetry<TransactionResult>('/transaction/status', {
      body: { txHash },
    });

    if (!response.success || !response.data) {
      throw new RPCError('Failed to get transaction status');
    }

    return response.data;
  }

  // ===========================================================================
  // CONTRACT OPERATIONS
  // ===========================================================================

  async callContract(request: ContractCallRequest): Promise<ContractCallResult> {
    logger.info('Calling contract', {
      contract: request.contractAddress,
      method: request.method,
    });

    const response = await this.requestWithRetry<ContractCallResult>('/contract/call', {
      body: request,
    });

    if (!response.success) {
      throw new RPCError('Contract call failed');
    }

    return response.data || {};
  }

  async readContract(request: ContractCallRequest): Promise<unknown> {
    logger.debug('Reading contract', {
      contract: request.contractAddress,
      method: request.method,
    });

    const response = await this.requestWithRetry<{ result: unknown }>('/contract/read', {
      body: request,
    });

    if (!response.success) {
      throw new RPCError('Contract read failed');
    }

    return response.data?.result;
  }

  // ===========================================================================
  // PRONEXMA-SPECIFIC OPERATIONS
  // ===========================================================================

  // These methods wrap the generic contract operations with Pronexma-specific logic

  async createAgreement(params: {
    beneficiary: string;
    oracleAdmin: string;
    totalAmount: bigint;
    milestoneAmounts: bigint[];
    title: string;
    from: string;
  }): Promise<{ agreementId: string; txHash: string }> {
    logger.info('Creating agreement on-chain', { beneficiary: params.beneficiary });

    // NOTE: In production, this would call the actual Pronexma contract
    // Contract address would be configured in environment
    const result = await this.callContract({
      contractAddress: 'PRONEXMA_VAULT_CONTRACT_ADDRESS',
      method: 'createAgreement',
      params: [
        params.beneficiary,
        params.oracleAdmin,
        params.totalAmount.toString(),
        params.milestoneAmounts.map((a) => a.toString()),
        params.title,
      ],
      from: params.from,
    });

    return {
      agreementId: result.result as string,
      txHash: result.txHash || '',
    };
  }

  async deposit(params: {
    agreementId: string;
    amount: bigint;
    from: string;
  }): Promise<{ txHash: string }> {
    logger.info('Depositing to agreement', {
      agreementId: params.agreementId,
      amount: params.amount.toString(),
    });

    const result = await this.callContract({
      contractAddress: 'PRONEXMA_VAULT_CONTRACT_ADDRESS',
      method: 'deposit',
      params: [params.agreementId],
      from: params.from,
    });

    return { txHash: result.txHash || '' };
  }

  async markMilestoneVerified(params: {
    agreementId: string;
    milestoneId: number;
    evidenceHash: string;
    from: string; // Oracle admin address
  }): Promise<{ txHash: string }> {
    logger.info('Marking milestone verified', {
      agreementId: params.agreementId,
      milestoneId: params.milestoneId,
    });

    const result = await this.callContract({
      contractAddress: 'PRONEXMA_VAULT_CONTRACT_ADDRESS',
      method: 'markMilestoneVerified',
      params: [params.agreementId, params.milestoneId, params.evidenceHash],
      from: params.from,
    });

    return { txHash: result.txHash || '' };
  }

  async releaseMilestone(params: {
    agreementId: string;
    milestoneId: number;
    from: string;
  }): Promise<{ txHash: string }> {
    logger.info('Releasing milestone funds', {
      agreementId: params.agreementId,
      milestoneId: params.milestoneId,
    });

    const result = await this.callContract({
      contractAddress: 'PRONEXMA_VAULT_CONTRACT_ADDRESS',
      method: 'releaseMilestone',
      params: [params.agreementId, params.milestoneId],
      from: params.from,
    });

    return { txHash: result.txHash || '' };
  }

  async refund(params: {
    agreementId: string;
    from: string;
  }): Promise<{ txHash: string }> {
    logger.info('Processing refund', { agreementId: params.agreementId });

    const result = await this.callContract({
      contractAddress: 'PRONEXMA_VAULT_CONTRACT_ADDRESS',
      method: 'refund',
      params: [params.agreementId],
      from: params.from,
    });

    return { txHash: result.txHash || '' };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const rpcClient = new QubicRPCClient();

// =============================================================================
// DEMO MODE WRAPPER
// =============================================================================

// This wrapper automatically routes to demo mode when RPC is unavailable
export class RPCClientWrapper {
  private rpc: QubicRPCClient;
  private forceDemoMode: boolean;

  constructor(rpc: QubicRPCClient, forceDemoMode: boolean = isDemoMode) {
    this.rpc = rpc;
    this.forceDemoMode = forceDemoMode;
  }

  async shouldUseDemoMode(): Promise<boolean> {
    if (this.forceDemoMode) {
      return true;
    }

    if (config.NETWORK_MODE === NetworkMode.DEMO_OFFCHAIN) {
      return true;
    }

    // Check if RPC is healthy
    const isHealthy = await this.rpc.checkHealth();
    if (!isHealthy) {
      logger.warn('RPC unhealthy - falling back to demo mode');
      return true;
    }

    return false;
  }

  getClient(): QubicRPCClient {
    return this.rpc;
  }

  async checkHealth(): Promise<{ healthy: boolean; mode: string }> {
    const useDemoMode = await this.shouldUseDemoMode();
    return {
      healthy: true, // Always healthy in demo mode
      mode: useDemoMode ? 'DEMO_OFFCHAIN' : config.NETWORK_MODE,
    };
  }
}

export const rpcWrapper = new RPCClientWrapper(rpcClient);
