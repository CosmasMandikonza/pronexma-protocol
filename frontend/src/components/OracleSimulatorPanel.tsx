// frontend/src/components/OracleSimulatorPanel.tsx
'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  Play,
  CheckCircle2, 
  AlertTriangle,
  Info,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Milestone } from '@/lib/api';
import { cn, getStatusLabel, getStatusColor } from '@/lib/utils';
import { formatAmount } from '@/lib/walletContext';

interface OracleSimulatorPanelProps {
  milestones: Milestone[];
  isDemoMode: boolean;
  onTrigger: (milestoneId: string) => Promise<void>;
  onRelease: (milestoneId: string) => Promise<void>;
}

export function OracleSimulatorPanel({
  milestones,
  isDemoMode,
  onTrigger,
  onRelease,
}: OracleSimulatorPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ id: string; action: string; success: boolean } | null>(null);

  const pendingMilestones = milestones.filter(m => m.state === 'PENDING');
  const verifiedMilestones = milestones.filter(m => m.state === 'VERIFIED');
  const hasActionable = pendingMilestones.length > 0 || verifiedMilestones.length > 0;

  const handleTrigger = async (milestoneId: string) => {
    setLoadingId(milestoneId);
    setLastAction(null);
    try {
      await onTrigger(milestoneId);
      setLastAction({ id: milestoneId, action: 'trigger', success: true });
    } catch (error) {
      setLastAction({ id: milestoneId, action: 'trigger', success: false });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRelease = async (milestoneId: string) => {
    setLoadingId(milestoneId);
    setLastAction(null);
    try {
      await onRelease(milestoneId);
      setLastAction({ id: milestoneId, action: 'release', success: true });
    } catch (error) {
      setLastAction({ id: milestoneId, action: 'release', success: false });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-amber/10">
          <Sparkles className="h-5 w-5 text-amber" />
        </div>
        <div>
          <h3 className="font-heading text-body font-semibold text-text-primary">
            Oracle Simulator
          </h3>
          <p className="text-caption text-text-muted">
            {isDemoMode ? 'Demo Mode' : 'Connected to Oracle'}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-primary/5 border border-primary/20">
        <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-caption text-text-secondary">
          In production, milestones are verified automatically via webhooks from GitHub, Jira, 
          or other integrated services. Use this panel to simulate oracle triggers for demo purposes.
        </p>
      </div>

      {/* Last action feedback */}
      {lastAction && (
        <div className={cn(
          'flex items-center gap-2 p-3 mb-4 rounded-lg',
          lastAction.success ? 'bg-emerald/10 border border-emerald/20' : 'bg-red/10 border border-red/20'
        )}>
          {lastAction.success ? (
            <CheckCircle2 className="h-4 w-4 text-emerald" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red" />
          )}
          <span className={cn('text-body-sm', lastAction.success ? 'text-emerald' : 'text-red')}>
            {lastAction.action === 'trigger' ? 'Milestone verified' : 'Funds released'} 
            {lastAction.success ? ' successfully' : ' - action failed'}
          </span>
        </div>
      )}

      {/* Actionable milestones */}
      {hasActionable ? (
        <div className="space-y-3">
          {/* Pending milestones - can be triggered */}
          {pendingMilestones.length > 0 && (
            <div>
              <h4 className="text-caption font-medium text-text-muted mb-2 uppercase tracking-wider">
                Awaiting Verification
              </h4>
              <div className="space-y-2">
                {pendingMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-text-primary truncate">
                          M{milestone.index + 1}: {milestone.title}
                        </span>
                      </div>
                      <div className="text-caption text-text-muted">
                        {formatAmount(milestone.amount)} QUBIC · {milestone.verificationSource}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTrigger(milestone.id)}
                      disabled={loadingId !== null}
                      className={cn(
                        'btn-secondary btn-sm whitespace-nowrap',
                        loadingId === milestone.id && 'opacity-75'
                      )}
                    >
                      {loadingId === milestone.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Trigger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified milestones - can be released */}
          {verifiedMilestones.length > 0 && (
            <div>
              <h4 className="text-caption font-medium text-text-muted mb-2 uppercase tracking-wider">
                Ready for Release
              </h4>
              <div className="space-y-2">
                {verifiedMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-body-sm font-medium text-text-primary truncate">
                          M{milestone.index + 1}: {milestone.title}
                        </span>
                      </div>
                      <div className="text-caption text-text-muted">
                        {formatAmount(milestone.amount)} QUBIC · Verified
                      </div>
                    </div>
                    <button
                      onClick={() => handleRelease(milestone.id)}
                      disabled={loadingId !== null}
                      className={cn(
                        'btn-success btn-sm whitespace-nowrap',
                        loadingId === milestone.id && 'opacity-75'
                      )}
                    >
                      {loadingId === milestone.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Release
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <CheckCircle2 className="h-8 w-8 text-emerald mx-auto mb-2" />
          <p className="text-body-sm text-text-muted">
            All milestones have been processed
          </p>
        </div>
      )}

      {/* Milestone summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-caption font-medium text-text-muted mb-2">All Milestones</h4>
        <div className="grid grid-cols-2 gap-2">
          {milestones.map(milestone => {
            const statusColor = getStatusColor(milestone.state);
            return (
              <div 
                key={milestone.id}
                className="flex items-center justify-between p-2 rounded bg-surface"
              >
                <span className="text-caption text-text-secondary truncate">
                  M{milestone.index + 1}
                </span>
                <span className={cn('pill text-[10px]', `pill-${statusColor}`)}>
                  {getStatusLabel(milestone.state)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
