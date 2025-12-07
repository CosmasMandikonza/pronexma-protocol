// frontend/src/components/VaultStateSummary.tsx
'use client';

import { Lock, Unlock, TrendingUp, Clock } from 'lucide-react';
import { Agreement } from '@/lib/api';
import { formatAmount } from '@/lib/walletContext';
import { cn, calculatePercentage, formatDate } from '@/lib/utils';

interface VaultStateSummaryProps {
  agreement: Agreement;
}

export function VaultStateSummary({ agreement }: VaultStateSummaryProps) {
  const lockedPercent = calculatePercentage(agreement.lockedAmount, agreement.totalAmount);
  const releasedPercent = calculatePercentage(agreement.releasedAmount, agreement.totalAmount);
  const remainingPercent = 100 - lockedPercent - releasedPercent;

  const isTimedOut = new Date(agreement.timeoutAt) < new Date();
  const daysRemaining = Math.max(0, Math.ceil(
    (new Date(agreement.timeoutAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-title font-semibold text-text-primary">
          Vault Summary
        </h2>
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-body-sm',
          isTimedOut 
            ? 'bg-red/10 text-red' 
            : daysRemaining <= 7 
              ? 'bg-amber/10 text-amber' 
              : 'bg-surface-alt text-text-muted'
        )}>
          <Clock className="h-4 w-4" />
          {isTimedOut ? 'Expired' : `${daysRemaining} days remaining`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-4 bg-surface-alt rounded-full overflow-hidden flex">
          {releasedPercent > 0 && (
            <div 
              className="bg-emerald transition-all duration-500"
              style={{ width: `${releasedPercent}%` }}
            />
          )}
          {lockedPercent > 0 && (
            <div 
              className="bg-primary transition-all duration-500"
              style={{ width: `${lockedPercent}%` }}
            />
          )}
          {remainingPercent > 0 && (
            <div 
              className="bg-surface transition-all duration-500"
              style={{ width: `${remainingPercent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-caption text-text-muted">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total */}
        <div className="p-4 rounded-lg bg-surface-alt border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-surface">
              <TrendingUp className="h-4 w-4 text-text-muted" />
            </div>
            <span className="text-caption text-text-muted">Total Value</span>
          </div>
          <div className="font-mono text-headline font-semibold text-text-primary">
            {formatAmount(agreement.totalAmount)}
          </div>
          <div className="text-caption text-text-muted">QUBIC</div>
        </div>

        {/* Locked */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <span className="text-caption text-text-muted">Locked</span>
          </div>
          <div className="font-mono text-headline font-semibold text-primary">
            {formatAmount(agreement.lockedAmount)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">QUBIC</span>
            <span className="text-caption font-medium text-primary">{lockedPercent}%</span>
          </div>
        </div>

        {/* Released */}
        <div className="p-4 rounded-lg bg-emerald/5 border border-emerald/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-emerald/10">
              <Unlock className="h-4 w-4 text-emerald" />
            </div>
            <span className="text-caption text-text-muted">Released</span>
          </div>
          <div className="font-mono text-headline font-semibold text-emerald">
            {formatAmount(agreement.releasedAmount)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">QUBIC</span>
            <span className="text-caption font-medium text-emerald">{releasedPercent}%</span>
          </div>
        </div>
      </div>

      {/* Timeout info */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-body-sm">
        <span className="text-text-muted">Agreement timeout</span>
        <span className="text-text-secondary">{formatDate(agreement.timeoutAt)}</span>
      </div>
    </div>
  );
}
