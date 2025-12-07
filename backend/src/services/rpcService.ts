// backend/src/services/rpcService.ts
// RPC Service - High-level RPC operations with automatic fallback handling

import { rpcWrapper, rpcClient, RPCError } from '../rpc/client.js';
import { rpcLogger as logger } from '../config/logger.js';
import { config, NetworkMode } from '../config/env.js';

// =============================================================================
// TYPES
// =============================================================================

export interface NetworkStatus {
  mode: string;
  rpcHealthy: boolean;
  rpcUrl: string;
  blockHeight?: number;
  lastChecked: Date;
}

export interface WalletInfo {
  address: string;
  balance: bigint;
  isDemo: boolean;
}

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class RPCService {
  private lastStatus: NetworkStatus | null = null;

  // ===========================================================================
  // NETWORK STATUS
  // ===========================================================================

  async getNetworkStatus(): Promise<NetworkStatus> {
    const useDemoMode = await rpcWrapper.shouldUseDemoMode();
    let rpcHealthy = false;

    if (!useDemoMode) {
      try {
        rpcHealthy = await rpcClient.checkHealth();
      } catch {
        rpcHealthy = false;
      }
    }

    const status: NetworkStatus = {
      mode: useDemoMode ? 'DEMO_OFFCHAIN' : config.NETWORK_MODE,
      rpcHealthy,
      rpcUrl: config.RPC_URL,
      lastChecked: new Date(),
    };

    this.lastStatus = status;
    return status;
  }

  getCachedStatus(): NetworkStatus | null {
    return this.lastStatus;
  }

  // ===========================================================================
  // WALLET OPERATIONS
  // ===========================================================================

  async getWalletBalance(address: string): Promise<WalletInfo> {
    const useDemoMode = await rpcWrapper.shouldUseDemoMode();

    if (useDemoMode) {
      // Return demo balance
      return this.getDemoWalletInfo(address);
    }

    try {
      const balance = await rpcClient.getBalance(address);
      return {
        address,
        balance: BigInt(balance.balance),
        isDemo: false,
      };
    } catch (error) {
      if (error instanceof RPCError && error.shouldFallback) {
        logger.warn('Falling back to demo wallet info', { address });
        return this.getDemoWalletInfo(address);
      }
      throw error;
    }
  }

  private getDemoWalletInfo(address: string): WalletInfo {
    // Check if this is one of the known demo wallets
    const demoWallets: Record<string, bigint> = {
      [config.DEMO_WALLET_INVESTOR]: BigInt(config.DEMO_WALLET_INVESTOR_BALANCE),
      [config.DEMO_WALLET_BENEFICIARY]: 0n,
      [config.DEMO_WALLET_ORACLE]: 1000000n,
    };

    const balance = demoWallets[address] ?? 1000000n; // Default balance for unknown demo addresses

    return {
      address,
      balance,
      isDemo: true,
    };
  }

  // ===========================================================================
  // DEMO WALLETS
  // ===========================================================================

  getDemoWallets() {
    return {
      investor: {
        address: config.DEMO_WALLET_INVESTOR,
        balance: BigInt(config.DEMO_WALLET_INVESTOR_BALANCE),
        role: 'investor',
        label: 'Demo Investor Wallet',
      },
      beneficiary: {
        address: config.DEMO_WALLET_BENEFICIARY,
        balance: 0n,
        role: 'beneficiary',
        label: 'Demo Project Team Wallet',
      },
      oracle: {
        address: config.DEMO_WALLET_ORACLE,
        balance: 1000000n,
        role: 'oracle',
        label: 'Demo Oracle Admin Wallet',
      },
    };
  }

  // ===========================================================================
  // MODE DETECTION
  // ===========================================================================

  async isInDemoMode(): Promise<boolean> {
    return rpcWrapper.shouldUseDemoMode();
  }

  getConfiguredMode(): NetworkMode {
    return config.NETWORK_MODE as NetworkMode;
  }
}

// Singleton export
export const rpcService = new RPCService();
