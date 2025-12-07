// frontend/src/lib/api.ts
// API client for Pronexma backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Agreement {
  id: string;
  title: string;
  description: string;
  payerAddress: string;
  beneficiaryAddress: string;
  oracleAdminAddress: string;
  totalAmount: string;
  lockedAmount: string;
  releasedAmount: string;
  state: 'PENDING' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'REFUNDED' | 'DISPUTED';
  timeoutAt: string;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  transactions?: Transaction[];
}

export interface Milestone {
  id: string;
  agreementId: string;
  index: number;
  title: string;
  description: string;
  amount: string;
  state: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'RELEASED' | 'CANCELLED';
  evidenceHash: string | null;
  verificationSource: string;
  verifiedAt: string | null;
  releasedAt: string | null;
}

export interface Transaction {
  id: string;
  agreementId: string;
  type: 'DEPOSIT' | 'RELEASE' | 'REFUND' | 'FEE';
  amount: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: string;
}

export interface CreateAgreementInput {
  title: string;
  description: string;
  payerAddress: string;
  beneficiaryAddress: string;
  oracleAdminAddress: string;
  totalAmount: string;
  timeoutDays: number;
  milestones: {
    title: string;
    description: string;
    amount: string;
    verificationSource: string;
  }[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  networkMode: string;
  demoMode: boolean;
  version: string;
}

export interface NetworkStatus {
  mode: string;
  rpcHealthy: boolean;
  blockHeight: number | null;
  connectedPeers: number | null;
}

export interface DemoWallet {
  address: string;
  label: string;
  role: string;
  balance: string;
}

export interface Stats {
  totalAgreements: number;
  activeAgreements: number;
  completedAgreements: number;
  totalValueLocked: string;
  totalValueReleased: string;
}

class ApiClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health endpoints
  async getHealth(): Promise<HealthResponse> {
    return this.request('GET', '/api/health');
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return this.request('GET', '/api/health/network');
  }

  async getDemoWallets(): Promise<DemoWallet[]> {
    return this.request('GET', '/api/health/demo-wallets');
  }

  // Agreement endpoints
  async getAgreements(params?: {
    role?: string;
    wallet?: string;
    state?: string;
  }): Promise<Agreement[]> {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.wallet) query.set('wallet', params.wallet);
    if (params?.state) query.set('state', params.state);
    
    const queryStr = query.toString();
    const path = queryStr ? `/api/agreements?${queryStr}` : '/api/agreements';
    return this.request('GET', path);
  }

  async getAgreement(id: string): Promise<Agreement> {
    return this.request('GET', `/api/agreements/${id}`);
  }

  async createAgreement(input: CreateAgreementInput): Promise<Agreement> {
    return this.request('POST', '/api/agreements', input);
  }

  async deposit(agreementId: string, amount: string): Promise<{ agreement: Agreement; transaction: Transaction }> {
    return this.request('POST', `/api/agreements/${agreementId}/deposit`, { amount });
  }

  async refund(agreementId: string): Promise<{ agreement: Agreement; transaction: Transaction }> {
    return this.request('POST', `/api/agreements/${agreementId}/refund`);
  }

  async triggerMilestone(
    agreementId: string,
    milestoneId: string,
    evidence?: { source: string; data: Record<string, unknown> }
  ): Promise<{ milestone: Milestone }> {
    return this.request('POST', `/api/agreements/${agreementId}/milestones/${milestoneId}/trigger`, evidence);
  }

  async releaseMilestone(
    agreementId: string,
    milestoneId: string
  ): Promise<{ agreement: Agreement; milestone: Milestone; transaction: Transaction }> {
    return this.request('POST', `/api/agreements/${agreementId}/milestones/${milestoneId}/release`);
  }

  async getStats(): Promise<Stats> {
    return this.request('GET', '/api/agreements/stats/summary');
  }
}

export const api = new ApiClient(API_BASE);
