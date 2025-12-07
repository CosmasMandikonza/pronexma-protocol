// frontend/src/lib/walletContext.tsx
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, DemoWallet } from './api';

export type WalletRole = 'investor' | 'beneficiary' | 'oracle';

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isDemoMode: boolean;
  
  // Wallet info
  address: string | null;
  label: string | null;
  role: WalletRole | null;
  balance: string | null;
  
  // Demo wallets available
  demoWallets: DemoWallet[];
  
  // Network state
  networkMode: string | null;
  networkHealthy: boolean;
  
  // Actions
  connectDemoWallet: (role: WalletRole) => Promise<void>;
  connectRealWallet: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  loadDemoWallets: () => Promise<void>;
  checkNetworkStatus: () => Promise<void>;
}

// Demo wallet addresses (matching backend .env.example)
const DEFAULT_DEMO_WALLETS: DemoWallet[] = [
  {
    address: 'DEMO_INVESTOR_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    label: 'Demo Investor',
    role: 'investor',
    balance: '1000000',
  },
  {
    address: 'DEMO_BENEFICIARY_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    label: 'Demo Project Team',
    role: 'beneficiary',
    balance: '0',
  },
  {
    address: 'DEMO_ORACLE_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    label: 'Demo Oracle',
    role: 'oracle',
    balance: '100000',
  },
];

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isDemoMode: true,
      address: null,
      label: null,
      role: null,
      balance: null,
      demoWallets: DEFAULT_DEMO_WALLETS,
      networkMode: null,
      networkHealthy: false,

      // Load demo wallets from backend
      loadDemoWallets: async () => {
        try {
          const wallets = await api.getDemoWallets();
          if (wallets.length > 0) {
            set({ demoWallets: wallets });
          }
        } catch (error) {
          console.warn('Failed to load demo wallets from backend, using defaults');
        }
      },

      // Check network status
      checkNetworkStatus: async () => {
        try {
          const status = await api.getNetworkStatus();
          set({
            networkMode: status.mode,
            networkHealthy: status.rpcHealthy,
          });
        } catch (error) {
          console.warn('Failed to check network status');
          set({ networkMode: 'DEMO_OFFCHAIN', networkHealthy: false });
        }
      },

      // Connect demo wallet by role
      connectDemoWallet: async (role: WalletRole) => {
        const { demoWallets } = get();
        const wallet = demoWallets.find(w => w.role === role);
        
        if (!wallet) {
          throw new Error(`No demo wallet found for role: ${role}`);
        }

        set({
          isConnected: true,
          isDemoMode: true,
          address: wallet.address,
          label: wallet.label,
          role: role,
          balance: wallet.balance,
        });

        // Check network status after connecting
        await get().checkNetworkStatus();
      },

      // Connect real wallet (placeholder for future integration)
      connectRealWallet: async () => {
        // TODO: Integrate with Qubic wallet extension/connector
        // For now, show a message that this is coming soon
        console.warn('Real wallet connection not yet implemented');
        throw new Error('Real wallet connection coming soon. Please use Demo Mode for now.');
      },

      // Disconnect wallet
      disconnect: () => {
        set({
          isConnected: false,
          isDemoMode: true,
          address: null,
          label: null,
          role: null,
          balance: null,
        });
      },

      // Refresh balance
      refreshBalance: async () => {
        const { address, isDemoMode, demoWallets } = get();
        
        if (!address) return;

        if (isDemoMode) {
          // Find balance from demo wallets
          const wallet = demoWallets.find(w => w.address === address);
          if (wallet) {
            set({ balance: wallet.balance });
          }
        } else {
          // TODO: Query real balance from RPC
          console.warn('Real balance query not yet implemented');
        }
      },
    }),
    {
      name: 'pronexma-wallet',
      partialize: (state) => ({
        isConnected: state.isConnected,
        isDemoMode: state.isDemoMode,
        address: state.address,
        label: state.label,
        role: state.role,
        balance: state.balance,
      }),
    }
  )
);

// Helper hook to get shortened address
export function shortenAddress(address: string | null): string {
  if (!address) return '';
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Format QUBIC amount with proper decimals
export function formatAmount(amount: string | null | undefined, decimals = 0): string {
  if (!amount) return '0';
  const num = BigInt(amount);
  if (decimals === 0) {
    return num.toLocaleString();
  }
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  if (fraction === BigInt(0)) {
    return whole.toLocaleString();
  }
  return `${whole.toLocaleString()}.${fraction.toString().padStart(decimals, '0')}`;
}
