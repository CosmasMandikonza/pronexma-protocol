// frontend/src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeaderShell } from '@/components/HeaderShell';
import { AgreementCard } from '@/components/AgreementCard';
import { useWallet, formatAmount } from '@/lib/walletContext';
import { api, Agreement, Stats } from '@/lib/api';

type FilterRole = 'all' | 'investor' | 'beneficiary' | 'oracle';
type FilterState = 'all' | 'PENDING' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'REFUNDED';

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, address, role, networkMode } = useWallet();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterState, setFilterState] = useState<FilterState>('all');

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    loadData();
  }, [isConnected, filterRole, filterState]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: { role?: string; wallet?: string; state?: string } = {};
      
      if (filterRole !== 'all' && address) {
        params.role = filterRole;
        params.wallet = address;
      } else if (address) {
        params.wallet = address;
      }
      
      if (filterState !== 'all') {
        params.state = filterState;
      }

      const [agreementData, statsData] = await Promise.all([
        api.getAgreements(params),
        api.getStats(),
      ]);
      
      setAgreements(agreementData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base">
      <HeaderShell />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Demo Mode Banner */}
        {networkMode === 'DEMO_OFFCHAIN' && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning">
              🔸 Running in Demo Mode — on-chain calls are simulated. In production, Pronexma connects directly to your Qubic node.
            </p>
          </div>
        )}

        {/* Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface rounded-xl p-6 border border-border">
            <div className="text-sm text-muted mb-1">Total Value Locked</div>
            <div className="text-2xl font-bold text-primary">
              {formatAmount(stats?.totalValueLocked)} <span className="text-sm font-normal text-muted">QUBIC</span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border">
            <div className="text-sm text-muted mb-1">Total Released</div>
            <div className="text-2xl font-bold text-success">
              {formatAmount(stats?.totalValueReleased)} <span className="text-sm font-normal text-muted">QUBIC</span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border">
            <div className="text-sm text-muted mb-1">Active Agreements</div>
            <div className="text-2xl font-bold text-text">{stats?.activeAgreements || 0}</div>
          </div>
          <div className="bg-surface rounded-xl p-6 border border-border">
            <div className="text-sm text-muted mb-1">Completed</div>
            <div className="text-2xl font-bold text-text">{stats?.completedAgreements || 0}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">Your Agreements</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-surface text-muted rounded">
              {agreements.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as FilterRole)}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            >
              <option value="all">All Roles</option>
              <option value="investor">As Investor</option>
              <option value="beneficiary">As Beneficiary</option>
              <option value="oracle">As Oracle</option>
            </select>

            {/* State Filter */}
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value as FilterState)}
              className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary"
            >
              <option value="all">All States</option>
              <option value="PENDING">Pending</option>
              <option value="FUNDED">Funded</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            {/* New Agreement Button */}
            <Link
              href="/agreements/new"
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              + New Agreement
            </Link>
          </div>
        </div>

        {/* Agreements List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted">Loading agreements...</div>
          </div>
        ) : agreements.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-xl border border-border">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-text mb-2">No active escrows yet</h3>
            <p className="text-muted mb-6">
              Secure your first Nostromo raise with a milestone-based vault.
            </p>
            <Link
              href="/agreements/new"
              className="px-6 py-3 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Agreement
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agreements.map((agreement) => (
              <AgreementCard
                key={agreement.id}
                agreement={agreement}
                currentWallet={address || ''}
                onClick={() => router.push(`/agreements/${agreement.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
