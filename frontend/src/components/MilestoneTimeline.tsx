// frontend/src/components/MilestoneTimeline.tsx
'use client';

import { 
  Circle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  ExternalLink,
  Loader2 
} from 'lucide-react';
import { Milestone } from '@/lib/api';
import { formatAmount } from '@/lib/walletContext';
import { cn, getStatusLabel, formatDateTime } from '@/lib/utils';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  isOracle?: boolean;
  onTrigger?: (milestoneId: string) => void;
  onRelease?: (milestoneId: string) => void;
  isLoading?: string | null; // milestoneId that's loading
}

export function MilestoneTimeline({ 
  milestones, 
  isOracle = false,
  onTrigger,
  onRelease,
  isLoading 
}: MilestoneTimelineProps) {
  const getStatusIcon = (state: Milestone['state']) => {
    switch (state) {
      case 'PENDING':
        return Circle;
      case 'IN_REVIEW':
        return Clock;
      case 'VERIFIED':
        return CheckCircle2;
      case 'RELEASED':
        return CheckCircle2;
      case 'CANCELLED':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const getStatusStyles = (state: Milestone['state']) => {
    switch (state) {
      case 'PENDING':
        return {
          icon: 'text-text-muted',
          line: 'bg-border',
          card: 'border-border',
          pill: 'pill-neutral',
        };
      case 'IN_REVIEW':
        return {
          icon: 'text-amber',
          line: 'bg-amber/30',
          card: 'border-amber/30',
          pill: 'pill-warning',
        };
      case 'VERIFIED':
        return {
          icon: 'text-primary',
          line: 'bg-primary/30',
          card: 'border-primary/30',
          pill: 'pill-primary',
        };
      case 'RELEASED':
        return {
          icon: 'text-emerald',
          line: 'bg-emerald',
          card: 'border-emerald/30',
          pill: 'pill-success',
        };
      case 'CANCELLED':
        return {
          icon: 'text-text-muted',
          line: 'bg-border',
          card: 'border-border opacity-60',
          pill: 'pill-neutral',
        };
      default:
        return {
          icon: 'text-red',
          line: 'bg-red/30',
          card: 'border-red/30',
          pill: 'pill-danger',
        };
    }
  };

  return (
    <div className="space-y-0">
      {milestones.map((milestone, index) => {
        const Icon = getStatusIcon(milestone.state);
        const styles = getStatusStyles(milestone.state);
        const isLast = index === milestones.length - 1;
        const isCurrentlyLoading = isLoading === milestone.id;

        return (
          <div key={milestone.id} className="relative flex gap-4">
            {/* Timeline line and icon */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'bg-surface-alt border-2 transition-colors',
                styles.icon === 'text-emerald' ? 'border-emerald bg-emerald/10' :
                styles.icon === 'text-primary' ? 'border-primary bg-primary/10' :
                styles.icon === 'text-amber' ? 'border-amber bg-amber/10' :
                'border-border'
              )}>
                {isCurrentlyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Icon className={cn('h-5 w-5', styles.icon)} />
                )}
              </div>
              {!isLast && (
                <div className={cn('w-0.5 flex-1 my-2 min-h-[2rem]', styles.line)} />
              )}
            </div>

            {/* Milestone card */}
            <div className={cn(
              'flex-1 mb-4 p-4 rounded-lg border bg-surface-alt/50 transition-all',
              styles.card,
              isCurrentlyLoading && 'ring-1 ring-primary'
            )}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-body font-semibold text-text-primary">
                      M{milestone.index + 1}: {milestone.title}
                    </h4>
                    <span className={cn('pill', styles.pill)}>
                      {getStatusLabel(milestone.state)}
                    </span>
                  </div>
                  {milestone.description && (
                    <p className="mt-1 text-body-sm text-text-muted">
                      {milestone.description}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-body font-semibold text-text-primary">
                    {formatAmount(milestone.amount)}
                  </div>
                  <div className="text-caption text-text-muted">QUBIC</div>
                </div>
              </div>

              {/* Verification info */}
              <div className="flex items-center gap-4 text-caption text-text-muted mt-3 pt-3 border-t border-border/50">
                <div>
                  <span className="text-text-muted">Source:</span>{' '}
                  <span className="text-text-secondary capitalize">
                    {milestone.verificationSource.replace('_', ' ')}
                  </span>
                </div>
                {milestone.verifiedAt && (
                  <div>
                    <span className="text-text-muted">Verified:</span>{' '}
                    <span className="text-text-secondary">
                      {formatDateTime(milestone.verifiedAt)}
                    </span>
                  </div>
                )}
                {milestone.releasedAt && (
                  <div>
                    <span className="text-text-muted">Released:</span>{' '}
                    <span className="text-emerald">
                      {formatDateTime(milestone.releasedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Evidence hash */}
              {milestone.evidenceHash && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-caption text-text-muted">Evidence:</span>
                  <code className="text-caption font-mono text-text-secondary bg-surface px-2 py-0.5 rounded">
                    {milestone.evidenceHash.slice(0, 16)}...
                  </code>
                  <button className="text-primary hover:text-primary-300 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Actions */}
              {(isOracle || milestone.state === 'VERIFIED') && (
                <div className="mt-4 pt-3 border-t border-border/50 flex gap-2">
                  {isOracle && milestone.state === 'PENDING' && onTrigger && (
                    <button
                      onClick={() => onTrigger(milestone.id)}
                      disabled={isCurrentlyLoading}
                      className="btn-secondary btn-sm"
                    >
                      {isCurrentlyLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Trigger Verification
                    </button>
                  )}
                  {milestone.state === 'VERIFIED' && onRelease && (
                    <button
                      onClick={() => onRelease(milestone.id)}
                      disabled={isCurrentlyLoading}
                      className="btn-success btn-sm"
                    >
                      {isCurrentlyLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Release Funds
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
