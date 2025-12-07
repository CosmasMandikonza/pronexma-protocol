// frontend/src/app/agreements/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeaderShell } from '@/components/HeaderShell';
import { useWallet, formatAmount } from '@/lib/walletContext';
import { api, CreateAgreementInput } from '@/lib/api';

interface MilestoneInput {
  title: string;
  description: string;
  amount: string;
  verificationSource: string;
}

type Step = 'parties' | 'funding' | 'milestones' | 'review';

const VERIFICATION_SOURCES = [
  { value: 'MANUAL', label: 'Manual Oracle', description: 'Verified manually by oracle admin' },
  { value: 'GITHUB', label: 'GitHub PR', description: 'Triggered when PR is merged' },
  { value: 'JIRA', label: 'Jira Ticket', description: 'Triggered when ticket is completed' },
  { value: 'INVOICE', label: 'Invoice Paid', description: 'Triggered when invoice is marked paid' },
];

export default function NewAgreementPage() {
  const router = useRouter();
  // NOTE: we no longer redirect when !isConnected – sandbox should work without a wallet.
  const { isConnected, address, role, demoWallets } = useWallet();

  const [step, setStep] = useState<Step>('parties');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [oracleAddress, setOracleAddress] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [timeoutDays, setTimeoutDays] = useState('30');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: '', description: '', amount: '', verificationSource: 'MANUAL' },
  ]);

  // Prefill addresses from demo wallets if available.
  useEffect(() => {
    const investorWallet = demoWallets?.find(w => w.role === 'investor');
    const beneficiaryWallet = demoWallets?.find(w => w.role === 'beneficiary');
    const oracleWallet = demoWallets?.find(w => w.role === 'oracle');

    if (role === 'investor' && address) {
      setPayerAddress(address);
      if (beneficiaryWallet) setBeneficiaryAddress(beneficiaryWallet.address);
    } else if (role === 'beneficiary' && address) {
      setBeneficiaryAddress(address);
      if (investorWallet) setPayerAddress(investorWallet.address);
    } else {
      // If no specific role, just prefill from demo wallets if they exist.
      if (!payerAddress && investorWallet) setPayerAddress(investorWallet.address);
      if (!beneficiaryAddress && beneficiaryWallet) setBeneficiaryAddress(beneficiaryWallet.address);
    }

    if (!oracleAddress && oracleWallet) {
      setOracleAddress(oracleWallet.address);
    }
  }, [address, role, demoWallets]); // removed isConnected and redirect

  const milestonesTotal = milestones.reduce((sum, m) => sum + (parseInt(m.amount) || 0), 0);
  const totalAmountNum = parseInt(totalAmount) || 0;
  const milestonesMatch = milestonesTotal === totalAmountNum && totalAmountNum > 0;

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      { title: '', description: '', amount: '', verificationSource: 'MANUAL' },
    ]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const canProceed = () => {
    switch (step) {
      case 'parties':
        return (
          title.trim() &&
          payerAddress.trim() &&
          beneficiaryAddress.trim() &&
          oracleAddress.trim()
        );
      case 'funding':
        return totalAmountNum > 0 && parseInt(timeoutDays) > 0;
      case 'milestones':
        return (
          milestones.every(m => m.title.trim() && parseInt(m.amount) > 0) &&
          milestonesMatch
        );
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const input: CreateAgreementInput = {
        title,
        description,
        payerAddress,
        beneficiaryAddress,
        oracleAdminAddress: oracleAddress,
        totalAmount,
        timeoutDays: parseInt(timeoutDays),
        milestones: milestones.map(m => ({
          title: m.title,
          description: m.description,
          amount: m.amount,
          verificationSource: m.verificationSource,
        })),
      };

      const agreement = await api.createAgreement(input);
      router.push(`/agreements/${agreement.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to create agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'parties', label: 'Parties' },
    { key: 'funding', label: 'Funding' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'review', label: 'Review' },
  ];

  return (
    <div className="min-h-screen bg-base">
      <HeaderShell />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-text mb-8">Create New Agreement</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => setStep(s.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  step === s.key
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-text'
                }`}
              >
                {i + 1}. {s.label}
              </button>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-surface rounded-xl p-6 border border-border">
          {/* Step 1: Parties */}
          {step === 'parties' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Agreement Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Nostromo DeFi Launch - Tranche 1"
                  className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the agreement terms and conditions..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Payer (Investor) Address
                    {role === 'investor' && <span className="text-primary ml-2">(You)</span>}
                  </label>
                  <input
                    type="text"
                    value={payerAddress}
                    onChange={e => setPayerAddress(e.target.value)}
                    placeholder="QUBIC address..."
                    className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text font-mono text-sm placeholder:text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Beneficiary (Project Team) Address
                    {role === 'beneficiary' && (
                      <span className="text-success ml-2">(You)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={beneficiaryAddress}
                    onChange={e => setBeneficiaryAddress(e.target.value)}
                    placeholder="QUBIC address..."
                    className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text font-mono text-sm placeholder:text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Oracle Admin Address
                    {role === 'oracle' && <span className="text-warning ml-2">(You)</span>}
                  </label>
                  <input
                    type="text"
                    value={oracleAddress}
                    onChange={e => setOracleAddress(e.target.value)}
                    placeholder="QUBIC address..."
                    className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text font-mono text-sm placeholder:text-muted focus:outline-none focus:border-primary"
                  />
                  <p className="mt-1 text-xs text-muted">
                    The address authorized to verify milestones
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Funding */}
          {step === 'funding' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Total Amount (QUBIC)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-primary"
                />
                <p className="mt-1 text-xs text-muted">
                  Total amount to be locked in the vault
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Timeout (Days)
                </label>
                <input
                  type="number"
                  value={timeoutDays}
                  onChange={e => setTimeoutDays(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="w-full px-4 py-3 bg-surface-alt border border-border rounded-lg text-text placeholder:text-muted focus:outline-none focus:border-primary"
                />
                <p className="mt-1 text-xs text-muted">
                  After this period, payer can request a refund if milestones are not met
                </p>
              </div>

              <div className="p-4 bg-surface-alt rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Protocol Fee (0.5%)</span>
                  <span className="text-sm text-text">
                    {formatAmount(Math.floor(totalAmountNum * 0.005).toString())} QUBIC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Milestones */}
          {step === 'milestones' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-text">Define Milestones</h3>
                  <p className="text-sm text-muted">
                    Funds will be released as each milestone is verified
                  </p>
                </div>
                <div
                  className={`text-sm ${
                    milestonesMatch ? 'text-success' : 'text-warning'
                  }`}
                >
                  {formatAmount(milestonesTotal.toString())} /{' '}
                  {formatAmount(totalAmount)} QUBIC
                </div>
              </div>

              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="p-4 bg-surface-alt rounded-lg border border-border space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text">
                      Milestone {index + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        onClick={() => removeMilestone(index)}
                        className="text-sm text-error hover:text-error/80"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={milestone.title}
                        onChange={e =>
                          updateMilestone(index, 'title', e.target.value)
                        }
                        placeholder="e.g. Alpha Release"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Amount (QUBIC)
                      </label>
                      <input
                        type="number"
                        value={milestone.amount}
                        onChange={e =>
                          updateMilestone(index, 'amount', e.target.value)
                        }
                        placeholder="25000"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={milestone.description}
                      onChange={e =>
                        updateMilestone(index, 'description', e.target.value)
                      }
                      placeholder="Describe what needs to be delivered..."
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Verification Source
                    </label>
                    <select
                      value={milestone.verificationSource}
                      onChange={e =>
                        updateMilestone(index, 'verificationSource', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-primary"
                    >
                      {VERIFICATION_SOURCES.map(source => (
                        <option key={source.value} value={source.value}>
                          {source.label} - {source.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={addMilestone}
                className="w-full p-3 border border-dashed border-border rounded-lg text-sm text-muted hover:text-text hover:border-primary transition-colors"
              >
                + Add Milestone
              </button>

              {!milestonesMatch && totalAmountNum > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning">
                    Milestone amounts must equal total amount (
                    {formatAmount(totalAmount)} QUBIC)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-text">Review Agreement</h3>

              <div className="space-y-4">
                <div className="p-4 bg-surface-alt rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-muted mb-2">
                    Agreement Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Title</span>
                      <span className="text-sm text-text">{title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Total Amount</span>
                      <span className="text-sm text-text">
                        {formatAmount(totalAmount)} QUBIC
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Timeout</span>
                      <span className="text-sm text-text">{timeoutDays} days</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-alt rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-muted mb-2">Parties</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted">Payer (Investor)</span>
                      <div className="text-sm text-text font-mono truncate">
                        {payerAddress}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted">Beneficiary</span>
                      <div className="text-sm text-text font-mono truncate">
                        {beneficiaryAddress}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted">Oracle Admin</span>
                      <div className="text-sm text-text font-mono truncate">
                        {oracleAddress}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-alt rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-muted mb-2">
                    Milestones ({milestones.length})
                  </h4>
                  <div className="space-y-2">
                    {milestones.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-2 border-b border-border last:border-0"
                      >
                        <div>
                          <div className="text-sm text-text">{m.title}</div>
                          <div className="text-xs text-muted">
                            {m.verificationSource}
                          </div>
                        </div>
                        <div className="text-sm text-text">
                          {formatAmount(m.amount)} QUBIC
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={() => {
                const stepIndex = steps.findIndex(s => s.key === step);
                if (stepIndex > 0) setStep(steps[stepIndex - 1].key);
                else router.push('/dashboard');
              }}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-text transition-colors"
            >
              {step === 'parties' ? 'Cancel' : 'Back'}
            </button>

            {step === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Agreement'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const stepIndex = steps.findIndex(s => s.key === step);
                  if (stepIndex < steps.length - 1) {
                    setStep(steps[stepIndex + 1].key);
                  }
                }}
                disabled={!canProceed()}
                className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
