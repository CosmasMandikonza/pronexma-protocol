// frontend/src/components/AgreementCard.tsx
'use client';

import Link from 'next/link';
import { ArrowRight, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Agreement } from '@/lib/api';
import { useWallet, shortenAddress, formatAmount } from '@/lib/walletContext';
import { cn, getStatusColor, getStatusLabel, formatDate, calculatePercentage } from '@/lib/utils';

interface AgreementCardProps {
  agreement: Agreement;
}

export function AgreementCard({ agreement }: AgreementCardProps) {
  const { address } = useWallet();
  
  // Determine user's role in this agreement
  const isPayer = address === agreement.payerAddress;
  const isBeneficiary = address === agreement.beneficiaryAddress;
  const isOracle = address === agreement.oracleAdminAddress;
  
  // Find current milestone
  const currentMilestone = agreement.milestones.find(
    m => m.state === 'PENDING' || m.state === 'IN_REVIEW' || m.state === 'VERIFIED'
  );
  
  // Calculate progress
  const releasedCount = agreement.milestones.filter(m => m.state === 'RELEASED').length;
  const totalMilestones = agreement.milestones.length;
  const progressPercent = calculatePercentage(agreement.releasedAmount, agreement.totalAmount);

  const statusColor = getStatusColor(agreement.state);

  return (
    <Link href={`/agreements/${agreement.id}`} className="block group">
      <div className="card p-5 transition-all hover:border-border-light hover:shadow-elevated">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-heading text-body font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                {agreement.title}
              </h3>
              <span className={cn('pill', `pill-${statusColor}`)}>
                {getStatusLabel(agreement.state)}
              </span>
            </div>
            <p className="text-body-sm text-text-muted line-clamp-1">
              {agreement.description || 'No description'}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>

        {/* Roles */}
        <div className="flex items-center gap-4 mb-4 text-caption">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            {isPayer && (
              <span className="text-primary font-medium">You (Payer)</span>
            )}
            {isBeneficiary && (
              <span className="text-emerald font-medium">You (Beneficiary)</span>
            )}
            {isOracle && (
              <span className="text-amber font-medium">You (Oracle)</span>
            )}
            {!isPayer && !isBeneficiary && !isOracle && (
              <span className="text-text-muted">
                {shortenAddress(agreement.payerAddress)} → {shortenAddress(agreement.beneficiaryAddress)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(agreement.createdAt)}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-caption text-text-muted">
              {releasedCount} of {totalMilestones} milestones
            </span>
            <span className="text-caption font-medium text-text-primary">
              {progressPercent}% released
            </span>
          </div>
          <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-emerald rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-center gap-6 pt-3 border-t border-border">
          <div>
            <div className="text-caption text-text-muted mb-0.5">Total</div>
            <div className="font-mono text-body-sm font-medium text-text-primary">
              {formatAmount(agreement.totalAmount)} <span className="text-text-muted">QUBIC</span>
            </div>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-0.5">Locked</div>
            <div className="font-mono text-body-sm font-medium text-primary">
              {formatAmount(agreement.lockedAmount)} <span className="text-text-muted">QUBIC</span>
            </div>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-0.5">Released</div>
            <div className="font-mono text-body-sm font-medium text-emerald">
              {formatAmount(agreement.releasedAmount)} <span className="text-text-muted">QUBIC</span>
            </div>
          </div>
        </div>

        {/* Current Milestone (if any) */}
        {currentMilestone && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber" />
              <span className="text-body-sm text-text-secondary">
                <span className="text-text-muted">Next:</span>{' '}
                {currentMilestone.title}
              </span>
              <span className={cn('pill pill-sm', `pill-${getStatusColor(currentMilestone.state)}`)}>
                {getStatusLabel(currentMilestone.state)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
