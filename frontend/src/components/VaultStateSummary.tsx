'use client';

import React from 'react';
import { formatAmount } from '@/lib/walletContext';

export type VaultStateSummaryProps = {
  totalAmount: string;
  lockedAmount: string;
  releasedAmount: string;
};

function toBigInt(value: string | undefined | null): bigint {
  try {
    return BigInt(value ?? '0');
  } catch {
    return BigInt(0);
  }
}

export function VaultStateSummary({
  totalAmount,
  lockedAmount,
  releasedAmount,
}: VaultStateSummaryProps) {
  const total = toBigInt(totalAmount);
  const locked = toBigInt(lockedAmount);
  const released = toBigInt(releasedAmount);

  const remaining = total > released ? total - released : BigInt(0);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
      {/* Total locked */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-xs font-medium text-muted mb-1 uppercase tracking-[0.16em]">
          Total QUBIC in vault
        </div>
        <div className="text-2xl font-semibold text-text">
          {formatAmount(totalAmount)}{' '}
          <span className="text-xs font-normal text-muted">QUBIC</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Full allocation committed to this agreement.
        </p>
      </div>

      {/* Released */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-xs font-medium text-muted mb-1 uppercase tracking-[0.16em]">
          Released to beneficiary
        </div>
        <div className="text-2xl font-semibold text-success">
          {formatAmount(releasedAmount)}{' '}
          <span className="text-xs font-normal text-muted">QUBIC</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Sum of all verified and paid-out milestones.
        </p>
      </div>

      {/* Remaining / still locked */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <div className="text-xs font-medium text-muted mb-1 uppercase tracking-[0.16em]">
          Still locked in vault
        </div>
        <div className="text-2xl font-semibold text-warning">
          {formatAmount(remaining.toString())}{' '}
          <span className="text-xs font-normal text-muted">QUBIC</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Will only unlock when remaining milestones are verified.
        </p>
      </div>
    </section>
  );
}
