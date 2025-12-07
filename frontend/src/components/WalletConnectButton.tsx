// frontend/src/components/WalletConnectButton.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Wallet, 
  ChevronDown, 
  LogOut, 
  User, 
  Building2, 
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWallet, shortenAddress, formatAmount, WalletRole } from '@/lib/walletContext';
import { cn } from '@/lib/utils';

interface RoleOption {
  role: WalletRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'investor',
    label: 'Investor',
    description: 'Fund agreements and escrows',
    icon: User,
  },
  {
    role: 'beneficiary',
    label: 'Project Team',
    description: 'Receive milestone-based releases',
    icon: Building2,
  },
  {
    role: 'oracle',
    label: 'Oracle Admin',
    description: 'Verify milestone completion',
    icon: Shield,
  },
];

export function WalletConnectButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isConnected,
    isDemoMode,
    address,
    label,
    role,
    balance,
    connectDemoWallet,
    connectRealWallet,
    disconnect,
    loadDemoWallets,
  } = useWallet();

  // Load demo wallets on mount
  useEffect(() => {
    loadDemoWallets();
  }, [loadDemoWallets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnectDemo = async (selectedRole: WalletRole) => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectDemoWallet(selectedRole);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectReal = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectRealWallet();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  // Connected state
  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
            'bg-surface-alt border-border hover:border-border-light',
            isOpen && 'border-border-focus ring-1 ring-border-focus'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
            <div className="text-left">
              <div className="text-body-sm font-medium text-text-primary">
                {label || shortenAddress(address)}
              </div>
              <div className="text-caption text-text-muted">
                {formatAmount(balance)} QUBIC
              </div>
            </div>
          </div>
          <ChevronDown className={cn(
            'h-4 w-4 text-text-muted transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface-elevated shadow-elevated animate-in">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                {isDemoMode && (
                  <span className="pill-warning text-[10px]">DEMO</span>
                )}
                <span className="text-body-sm font-medium text-text-primary capitalize">
                  {role} Wallet
                </span>
              </div>
              <div className="font-mono text-caption text-text-muted break-all">
                {address}
              </div>
            </div>
            <div className="p-2">
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-body-sm text-red hover:bg-red/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'btn-primary',
          isConnecting && 'opacity-75 cursor-wait'
        )}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        <span>Connect Wallet</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-surface-elevated shadow-elevated animate-in">
          {error && (
            <div className="p-3 bg-red/10 border-b border-red/20">
              <div className="flex items-start gap-2 text-body-sm text-red">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            </div>
          )}

          <div className="p-3 border-b border-border">
            <h3 className="font-heading text-body font-semibold text-text-primary mb-1">
              Demo Mode
            </h3>
            <p className="text-caption text-text-muted">
              Select a role to explore Pronexma with a pre-funded demo wallet.
            </p>
          </div>

          <div className="p-2">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.role}
                  onClick={() => handleConnectDemo(option.role)}
                  disabled={isConnecting}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    'hover:bg-surface-alt text-left',
                    isConnecting && 'opacity-50 cursor-wait'
                  )}
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-body-sm font-medium text-text-primary">
                      {option.label}
                    </div>
                    <div className="text-caption text-text-muted">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={handleConnectReal}
              disabled={isConnecting}
              className="w-full btn-secondary btn-sm justify-center"
            >
              <Wallet className="h-4 w-4" />
              Connect Real Wallet
            </button>
            <p className="mt-2 text-center text-caption text-text-muted">
              Qubic wallet integration coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
