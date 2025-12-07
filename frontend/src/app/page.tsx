'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/lib/walletContext';
import { api } from '@/lib/api';

type Stats = {
  totalValueLocked: string;
  activeAgreements: number;
};

function formatTVL(amount: string) {
  const num = parseInt(amount || '0', 10);
  if (Number.isNaN(num)) return '0';

  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
}

function networkLabel(mode?: string) {
  switch (mode) {
    case 'DEMO_OFFCHAIN':
      return 'Sandbox · off-chain simulation';
    case 'PUBLIC_TESTNET':
      return 'Public testnet';
    case 'LOCAL_DEV':
      return 'Local node';
    default:
      return 'Sandbox';
  }
}

export default function DashboardPage() {
  const { networkMode } = useWallet();
  const [stats, setStats] = useState<Stats>({
    totalValueLocked: '0',
    activeAgreements: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStats();
        setStats({
          totalValueLocked: data.totalValueLocked ?? '0',
          activeAgreements: data.activeAgreements ?? 0,
        });
      } catch {
        // keep graceful defaults if stats endpoint fails
      }
    })();
  }, []);

  const tvl = formatTVL(stats.totalValueLocked);

  return (
    <div className="min-h-screen bg-base text-text">
      {/* Top bar */}
      <header className="border-b border-border/70 bg-gradient-to-b from-base/80 to-base/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="space-y-1 text-xs text-muted">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted">
              <span className="h-[3px] w-[3px] rounded-full bg-primary/70" />
              <span>Operations console</span>
              <span className="text-muted/70">•</span>
              <span>Qubic · Nostromo launchpad</span>
            </div>
            <div className="text-[11px] text-subtle">
              Configure vaults, milestones, and event sources from a single control surface.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              <span className="font-medium text-text-secondary">Mode:</span>
              <span className="text-text-primary">{networkLabel(networkMode)}</span>
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* HERO + VAULT CARD */}
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-12 lg:pb-20 lg:pt-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            {/* Left: copy + stats */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-text-secondary">
                Milestone-native settlement layer for Nostromo launches
              </div>

              <div className="space-y-4">
                <h1 className="text-balance text-4xl font-bold leading-tight text-text-primary sm:text-5xl lg:text-[3rem]">
                  Secure QUBIC vaults{' '}
                  <span className="bg-gradient-to-r from-primary via-emerald-400 to-sky-400 bg-clip-text text-transparent">
                    that unlock on real-world events
                  </span>
                </h1>

                <p className="max-w-xl text-pretty text-sm sm:text-base text-text-muted">
                  Pronexma is a programmable escrow and vesting layer for Qubic/Nostromo.
                  Launch teams and RWA deals lock QUBIC into vaults. Tranches only release when
                  off-chain milestones (GitHub PRs, audits, invoices) are cryptographically
                  confirmed.
                </p>
              </div>

              {/* Stats row */}
              <div className="grid max-w-xl gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-surface-alt/90 p-4 shadow-soft">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-secondary">
                    QUBIC locked
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-primary">
                    {tvl}
                  </div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    Mirrors live vault behaviour using the sandbox backend.
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-alt/90 p-4 shadow-soft">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-secondary">
                    Active agreements
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-emerald-300">
                    {stats.activeAgreements}
                  </div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    Create agreements from this console and monitor them here.
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface-alt/90 p-4 shadow-soft">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-secondary">
                    Verified sources
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-sky-300">
                    4
                  </div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    GitHub · GitLab · Jira · Invoices (+ manual controls).
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/agreements/new"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.45)] transition-transform transition-shadow hover:-translate-y-[1px] hover:shadow-[0_22px_55px_rgba(59,130,246,0.6)]"
                >
                  New agreement
                </Link>

                <a
                  href="#nostromo-flow"
                  className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  View settlement flow →
                </a>
              </div>
            </div>

            {/* Right: “3D” vault card */}
            <div className="relative flex items-center justify-center">
              <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(52,211,153,0.22),transparent_55%)] opacity-80 blur-3xl" />

              <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-card-border bg-[radial-gradient(circle_at_16%_0%,rgba(56,189,248,0.32),rgba(15,23,42,0.96)_45%,rgba(2,6,23,1)_100%)] shadow-[0_32px_90px_rgba(15,23,42,0.95)]">
                {/* subtle grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-screen">
                  <div className="h-full w-full bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:32px_32px]" />
                </div>

                <div className="relative flex h-full flex-col justify-between p-6">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <div className="space-y-0.5">
                      <div className="font-semibold tracking-[0.18em] text-xs text-text-primary">
                        QUBIC VAULT
                      </div>
                      <div className="text-[11px] text-text-muted">
                        Nostromo launch agreement
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/40">
                      Active vault
                    </span>
                  </div>

                  {/* Orbiting visualization */}
                  <div className="mt-6 flex flex-1 items-center justify-center">
                    <div className="relative h-52 w-52">
                      {/* glow */}
                      <div className="absolute inset-6 rounded-full bg-primary/50 blur-3xl" />

                      {/* outer orbit */}
                      <div className="absolute inset-0 rounded-full border border-primary/30 bg-surface/50 backdrop-blur-md" />

                      {/* mid ring */}
                      <div className="absolute inset-5 rounded-full border border-sky-400/60 shadow-[0_0_40px_rgba(56,189,248,0.6)]" />

                      {/* inner core */}
                      <div className="absolute inset-11 flex items-center justify-center rounded-full border border-emerald-300/70 bg-[radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.6),rgba(15,23,42,1))] shadow-[0_0_40px_rgba(52,211,153,0.75)]">
                        <div className="text-center">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/90">
                            Milestone hash
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-emerald-100/90">
                            0x9a…3f
                          </div>
                        </div>
                      </div>

                      {/* orbiting chips */}
                      <div className="absolute inset-0 animate-[spin_22s_linear_infinite]">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                          <div className="rounded-full border border-primary/40 bg-black/70 px-2 py-1 text-[10px] text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.6)] backdrop-blur">
                            GitHub PR • merged
                          </div>
                        </div>

                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
                          <div className="rounded-full border border-emerald-400/50 bg-black/70 px-2 py-1 text-[10px] text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.7)] backdrop-blur">
                            Audit • passed
                          </div>
                        </div>

                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
                          <div className="rounded-full border border-amber-300/60 bg-black/70 px-2 py-1 text-[10px] text-amber-200 shadow-[0_0_18px_rgba(252,211,77,0.65)] backdrop-blur">
                            Invoice • paid
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">
                          <div className="rounded-full border border-border-light/70 bg-black/70 px-2 py-1 text-[10px] text-text-secondary shadow-[0_0_18px_rgba(148,163,184,0.55)] backdrop-blur">
                            Oracle signs • QUBIC released
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* footer row */}
                  <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                    <span className="rounded-full bg-surface-alt/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary">
                      No wallet required in sandbox mode
                    </span>
                    <span className="rounded-full bg-surface-alt/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary">
                      On-chain when wired to your node
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT FITS THE FLOW */}
        <section
          id="nostromo-flow"
          className="border-y border-border/60 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.8),rgba(2,6,23,1))] py-16"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">
                How Pronexma fits into the Nostromo flow
              </h2>
              <p className="mt-3 text-sm text-text-muted">
                Use Pronexma as the settlement engine for IDOs and RWA deals:
                QUBIC comes in, milestone-verified tranches go out.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface-alt/90 p-5 shadow-soft">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">
                  🔒
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  1. Lock funds into a vault
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Investor or buyer deposits QUBIC into a Pronexma Vault with a milestone
                  schedule — audit passed, mainnet live, revenue targets hit.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/90 p-5 shadow-soft">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-lg">
                  📡
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  2. Verify off-chain milestones
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Webhooks &amp; oracles listen to GitHub, Jira, invoicing tools or manual approvals.
                  Evidence is hashed and bound to each milestone.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/90 p-5 shadow-soft">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-lg">
                  💸
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  3. Release tranches on-chain
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  When a milestone is verified, the corresponding QUBIC tranche is released to
                  the team or seller — fully transparent &amp; auditable for counterparties.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3-STEP PRODUCT WALKTHROUGH (neutral, not judges) */}
        <section className="bg-base py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">
                From agreement to release in three steps
              </h2>
              <p className="mt-3 text-sm text-text-muted">
                This is the path teams use to model a full Nostromo deal in the sandbox before
                going live with their own node.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface-alt/95 p-6 shadow-soft">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Step 1
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Create an agreement
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Define investor, team wallet, total QUBIC, and 3–5 milestones that actually
                  matter (alpha shipped, audit signed, revenue targets).
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/95 p-6 shadow-soft">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Step 2
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Trigger a milestone event
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Use the built-in controls to simulate a GitHub PR merge, a passed audit, or an
                  invoice getting paid. The backend hashes the evidence and pins it to the
                  milestone.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/95 p-6 shadow-soft">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Step 3
                </div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Observe balances and states
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Watch locked and released amounts update in real time as milestones flip from
                  pending to verified, with evidence hashes pinned for auditability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES + ARCH OVERVIEW */}
        <section className="border-t border-border/70 bg-surface py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">
                High-impact use cases
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface-alt/95 p-6 shadow-soft">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">
                  🚀 Nostromo launch vesting
                </h3>
                <p className="text-sm text-text-muted">
                  Teams raise via Nostromo IDO. Instead of instant unlocks, funds flow into a
                  Pronexma Vault with milestones like alpha shipped, audit passed, mainnet
                  deployed.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text-muted">
                  <li>✓ Investor protection and downside guardrails.</li>
                  <li>✓ Clear accountability for teams.</li>
                  <li>✓ Milestones wired into tools teams already use (GitHub, Jira, invoices).</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/95 p-6 shadow-soft">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">
                  📄 RWA / B2B settlement
                </h3>
                <p className="text-sm text-text-muted">
                  Buyer and seller agree to QUBIC escrow for real-world invoices. Funds release
                  when shipments land, invoices are approved, or payments are confirmed in external
                  systems.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text-muted">
                  <li>✓ Faster &amp; leaner than Letters of Credit.</li>
                  <li>✓ Fully programmable settlement conditions.</li>
                  <li>✓ On-chain audit trail with off-chain proofs.</li>
                </ul>
              </div>
            </div>

            <div className="mt-14 text-center">
              <h3 className="text-xl font-semibold text-text-primary">
                Architecture overview
              </h3>
              <p className="mt-3 text-sm text-text-muted">
                Pronexma sits between Nostromo launch flows and external systems, turning
                real-world events into deterministic QUBIC settlements.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface-alt/95 p-5 text-left shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  Layer 1
                </div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  Qubic vault contract
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  C++ contract on Qubic. Holds QUBIC, enforces milestone schedule, and exposes
                  functions to lock, verify, and release tranches.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/95 p-5 text-left shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  Layer 2
                </div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  Pronexma oracle backend
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  Node.js backend with Prisma &amp; RPC client. Stores agreements, milestones, and
                  webhook events. Signs and broadcasts transactions to your node in production.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface-alt/95 p-5 text-left shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
                  Layer 3
                </div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  External event sources
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  GitHub/GitLab, Jira, invoicing tools or manual admin actions send webhooks.
                  Evidence hashes are stored off-chain and referenced inside QUBIC settlement
                  events.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-base py-6">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-text-muted">
          Pronexma Protocol · Qubic – Nostromo Launchpad
        </div>
      </footer>
    </div>
  );
}

