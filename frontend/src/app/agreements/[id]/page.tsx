// frontend/src/app/agreements/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { HeaderShell } from '@/components/HeaderShell';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { OracleSimulatorPanel } from '@/components/OracleSimulatorPanel';
import { VaultStateSummary } from '@/components/VaultStateSummary';
import { useWallet, shortenAddress, formatAmount } from '@/lib/walletContext';
import { api, Agreement } from '@/lib/api';

type UserRole = 'payer' | 'beneficiary' | 'oracle' | 'none';

export default function AgreementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agreementId = params.id as string;
  const { isConnected, address, networkMode } = useWallet();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOTE: no redirect on !isConnected – allow viewing in sandbox.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getAgreement(agreementId);
        setAgreement(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load agreement');
      } finally {
        setLoading(false);
      }
    };

    if (agreementId) {
      load();
    }
  }, [agreementId]);

  const getUserRole = useCallback((): UserRole => {
    if (!agreement || !address) return 'none';
    if (agreement.payerAddress === address) return 'payer';
    if (agreement.beneficiaryAddress === address) return 'beneficiary';
    if (agreement.oracleAdminAddress === address) return 'oracle';
    return 'none';
  }, [agreement, address]);

  const handleDeposit = async () => {
    if (!agreement) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.deposit(agreement.id, agreement.totalAmount);
      const updated = await api.getAgreement(agreement.id);
      setAgreement(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!agreement) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.refund(agreement.id);
      const updated = await api.getAgreement(agreement.id);
      setAgreement(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to request refund');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerMilestone = async (milestoneId: string) => {
    if (!agreement) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.triggerMilestone(agreement.id, milestoneId, {
        source: 'MANUAL',
        data: { triggeredBy: address, triggeredAt: new Date().toISOString() },
      });
      const updated = await api.getAgreement(agreement.id);
      setAgreement(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to trigger milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    if (!agreement) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.releaseMilestone(agreement.id, milestoneId);
      const updated = await api.getAgreement(agreement.id);
      setAgreement(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to release milestone');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <HeaderShell />
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="animate-pulse text-muted">Loading agreement...</div>
        </div>
      </div>
    );
  }

  if (error && !agreement) {
    return (
      <div className="min-h-screen bg-base">
        <HeaderShell />
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="text-error mb-4">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!agreement) {
    return null;
  }

  const userRole = getUserRole();
  const canDeposit = userRole === 'payer' && agreement.state === 'PENDING';
  const canRefund =
    userRole === 'payer' && ['FUNDED', 'ACTIVE'].includes(agreement.state);
  const canTrigger = userRole === 'oracle';
  const canRelease = userRole === 'oracle';

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PENDING':
        return 'text-warning bg-warning/10';
      case 'FUNDED':
        return 'text-primary bg-primary/10';
      case 'ACTIVE':
        return 'text-success bg-success/10';
      case 'COMPLETED':
        return 'text-success bg-success/10';
      case 'REFUNDED':
        return 'text-muted bg-surface-alt';
      case 'DISPUTED':
        return 'text-error bg-error/10';
      default:
        return 'text-muted bg-surface-alt';
    }
  };

  return (
    <div className="min-h-screen bg-base">
      <HeaderShell />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Demo Mode Banner */}
        {networkMode === 'DEMO_OFFCHAIN' && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning">
              🔸 Running in Demo Mode — on-chain calls are simulated. In production,
              Pronexma connects directly to your Qubic node.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text">{agreement.title}</h1>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${getStateColor(
                  agreement.state,
                )}`}
              >
                {agreement.state}
              </span>
            </div>
            <p className="text-sm text-muted">
              ID: {agreement.id}
              {userRole !== 'none' && (
                <span className="ml-3 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                  You are{' '}
                  {userRole === 'payer'
                    ? 'Investor'
                    : userRole === 'beneficiary'
                    ? 'Beneficiary'
                    : 'Oracle Admin'}
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {canDeposit && (
              <button
                onClick={handleDeposit}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {actionLoading
                  ? 'Processing...'
                  : `Deposit ${formatAmount(agreement.totalAmount)} QUBIC`}
              </button>
            )}
            {canRefund && (
              <button
                onClick={handleRefund}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Request Refund'}
              </button>
            )}
          </div>
        </div>

        {/* Vault State Summary */}
        <VaultStateSummary
          totalAmount={agreement.totalAmount}
          lockedAmount={agreement.lockedAmount}
          releasedAmount={agreement.releasedAmount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {agreement.description && (
              <div className="bg-surface rounded-xl p-6 border border-border">
                <h3 className="text-sm font-medium text-muted mb-2">Description</h3>
                <p className="text-text">{agreement.description}</p>
              </div>
            )}

            {/* Parties */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="text-sm font-medium text-muted mb-4">Parties</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-1">Payer (Investor)</div>
                    <div className="text-sm text-text font-mono">
                      {shortenAddress(agreement.payerAddress)}
                    </div>
                  </div>
                  {agreement.payerAddress === address && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-1">
                      Beneficiary (Project Team)
                    </div>
                    <div className="text-sm text-text font-mono">
                      {shortenAddress(agreement.beneficiaryAddress)}
                    </div>
                  </div>
                  {agreement.beneficiaryAddress === address && (
                    <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted mb-1">Oracle Admin</div>
                    <div className="text-sm text-text font-mono">
                      {shortenAddress(agreement.oracleAdminAddress)}
                    </div>
                  </div>
                  {agreement.oracleAdminAddress === address && (
                    <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded">
                      You
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="text-sm font-medium text-muted mb-4">Milestones</h3>
              <MilestoneTimeline
                milestones={agreement.milestones}
                canRelease={canRelease}
                onRelease={handleReleaseMilestone}
                loading={actionLoading}
              />
            </div>

            {/* Transaction History */}
            {agreement.transactions && agreement.transactions.length > 0 && (
              <div className="bg-surface rounded-xl p-6 border border-border">
                <h3 className="text-sm font-medium text-muted mb-4">
                  Transaction History
                </h3>
                <div className="space-y-3">
                  {agreement.transactions.map(tx => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-surface-alt rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            tx.status === 'CONFIRMED'
                              ? 'bg-success'
                              : tx.status === 'PENDING'
                              ? 'bg-warning'
                              : 'bg-error'
                          }`}
                        />
                        <div>
                          <div className="text-sm text-text">{tx.type}</div>
                          <div className="text-xs text-muted font-mono">
                            {shortenAddress(tx.txHash)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-text">
                          {formatAmount(tx.amount)} QUBIC
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Oracle Simulator */}
          <div className="lg:col-span-1">
            <OracleSimulatorPanel
              milestones={agreement.milestones}
              agreementState={agreement.state}
              canTrigger={canTrigger}
              onTrigger={handleTriggerMilestone}
              loading={actionLoading}
            />

            {/* Agreement Info */}
            <div className="mt-6 bg-surface rounded-xl p-6 border border-border">
              <h3 className="text-sm font-medium text-muted mb-4">Agreement Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Created</span>
                  <span className="text-text">
                    {new Date(agreement.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Timeout</span>
                  <span className="text-text">
                    {new Date(agreement.timeoutAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Protocol Fee</span>
                  <span className="text-text">0.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
