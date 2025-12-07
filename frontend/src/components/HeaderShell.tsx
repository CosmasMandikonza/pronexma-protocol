// frontend/src/components/HeaderShell.tsx
'use client';

import Link from 'next/link';
import { Box, FileText, LayoutDashboard } from 'lucide-react';
import { WalletConnectButton } from './WalletConnectButton';

interface HeaderShellProps {
  showDashboardLink?: boolean;
}

export function HeaderShell({ showDashboardLink = true }: HeaderShellProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-base/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <Box className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/20 blur-xl" />
              </div>
              <span className="font-heading text-xl font-bold text-text-primary">
                PRONEXMA
              </span>
              <span className="pill-primary text-[10px] uppercase tracking-wider">
                Protocol
              </span>
            </Link>
          </div>

          {/* Center: Track indicator */}
          <div className="hidden md:flex items-center">
            <span className="px-3 py-1 bg-surface-alt rounded-full text-caption text-text-muted">
              Track 1 · Nostromo Launchpad
            </span>
          </div>

          {/* Right: Navigation + Wallet */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="https://github.com/pronexma/protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
              >
                <FileText className="h-4 w-4" />
                <span>Docs</span>
              </Link>
              {showDashboardLink && (
                <Link href="/dashboard" className="btn-ghost btn-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              )}
            </nav>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
