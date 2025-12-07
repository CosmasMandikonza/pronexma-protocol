# Pronexma Protocol

**Milestone-Based Settlement Layer for Qubic/Nostromo**

> Trustless escrow and vesting infrastructure for Nostromo launches and RWA settlements. Lock funds. Verify milestones. Release programmatically.

[![Track 1: Nostromo Launchpad](https://img.shields.io/badge/Qubic-Track%201%20Nostromo-4B7CFF?style=flat-square)](https://qubic.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

---

## Problem

Launchpads and RWA transactions face a fundamental trust problem:

- **For IDO/ICO launches**: Teams raise funds and may underdeliver or disappear. Investors have no recourse.
- **For B2B/RWA deals**: Cross-border settlements rely on slow, expensive intermediaries (banks, escrow agents). Disputes are costly.

Current solutions either require full trust in one party, or use simplistic time-locked vesting that doesn't account for actual milestone completion.

## Solution

**Pronexma** is a milestone-based escrow protocol built for Qubic's Nostromo ecosystem.

1. Funds from launches or B2B deals are deposited into a **Pronexma Vault** smart contract
2. The vault defines **milestones** (e.g., "Alpha shipped", "Audit passed", "Invoice approved")
3. When an off-chain event occurs (GitHub PR merged, audit report uploaded, shipment confirmed), an **Oracle** verifies and signs the milestone completion
4. The vault **releases funds** to the beneficiary proportionally per verified milestone
5. If milestones aren't met within agreed timeframes, funds can be **refunded** to the payer

This creates accountability and trust without slow intermediaries.

## Why Qubic + Nostromo?

- **Deterministic Compute**: Qubic's unique computational model ensures consistent, verifiable state transitions
- **Nostromo Launchpad**: As the official IDO platform for Qubic, Nostromo needs a trust layer—Pronexma is designed to be that layer
- **High Throughput**: Qubic's architecture supports the transaction volume needed for active settlement markets
- **Ecosystem Alignment**: Built specifically for Qubic's infrastructure, not a generic EVM port

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRONEXMA PROTOCOL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Investor/Buyer]                                    [Team/Seller]           │
│        │                                                   ▲                 │
│        │ deposit()                              release()  │                 │
│        ▼                                                   │                 │
│  ┌─────────────────────────────────────────────────────────┴───────────┐    │
│  │                    PRONEXMA VAULT (C++ Contract)                     │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │    │
│  │  │ Agreement  │  │ Milestone  │  │ Milestone  │  │ Milestone  │     │    │
│  │  │ ID: AG-001 │  │ M1: 30%    │  │ M2: 40%    │  │ M3: 30%    │     │    │
│  │  │ Total: 1M  │  │ ✓ Verified │  │ ◷ Pending  │  │ ◷ Pending  │     │    │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │    │
│  └─────────────────────────────────▲───────────────────────────────────┘    │
│                                    │                                         │
│                    markMilestoneVerified(signature)                         │
│                                    │                                         │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                    PRONEXMA ORACLE BACKEND                           │    │
│  │  • Validates external events                                         │    │
│  │  • Signs milestone verifications                                     │    │
│  │  • Orchestrates on-chain transactions                                │    │
│  └─────────────────────────────────▲───────────────────────────────────┘    │
│                                    │                                         │
│            ┌───────────────────────┼───────────────────────┐                │
│            │                       │                       │                 │
│    ┌───────┴───────┐      ┌───────┴───────┐      ┌───────┴───────┐         │
│    │   GitHub PR   │      │  Invoice SaaS │      │   Shipment    │         │
│    │    Merged     │      │    Approved   │      │   Confirmed   │         │
│    └───────────────┘      └───────────────┘      └───────────────┘         │
│           External Event Sources (via Webhooks / EasyConnect)               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Description | Location |
|-----------|-------------|----------|
| **Pronexma Vault** | C++ smart contract managing escrow state, milestones, releases | `contracts/PronexmaVault.cpp` |
| **Oracle Backend** | Node.js/TypeScript service for event validation and tx orchestration | `backend/` |
| **RPC Bridge** | Abstraction layer for Qubic node communication with fallback modes | `backend/src/rpc/` |
| **Web Frontend** | Next.js dashboard for creating/managing agreements | `frontend/` |
| **Webhook Receiver** | Endpoints for external automation (GitHub, Zapier, etc.) | `backend/src/routes/webhooks.ts` |

## Quick Start

### Option A: Full Stack (with Qubic Infrastructure)

Prerequisites:
- Docker & Docker Compose
- Node.js 18+
- Qubic Core Lite node (optional, falls back to demo mode)

```bash
# Clone the repository
git clone https://github.com/your-org/pronexma-protocol.git
cd pronexma-protocol

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# - Set RPC_URL to your local Qubic RPC endpoint
# - Set ORACLE_PRIVATE_KEY for signing

# Start all services
./scripts/start-dev.sh

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

### Option B: Demo Mode (No Qubic Infrastructure Required)

```bash
# Clone and setup
git clone https://github.com/your-org/pronexma-protocol.git
cd pronexma-protocol

# Install backend dependencies
cd backend && npm install

# Start backend in demo mode
DEMO_MODE=true npm run dev

# In another terminal, start frontend
cd ../frontend && npm install && npm run dev

# Open http://localhost:3000
```

In Demo Mode:
- All on-chain transactions are simulated
- State is persisted in local SQLite
- Full UI/UX flow is preserved
- Perfect for evaluation and demos

## Demo Flow (60-90 Second Video Script)

1. **Connect Wallet** (0:00-0:10)
   - Open Pronexma at localhost:3000
   - Click "Continue in Demo Mode"
   - Select role: "Investor"

2. **Create Agreement** (0:10-0:35)
   - Click "New Agreement"
   - Title: "Nostromo DeFi Protocol - Series A Vesting"
   - Set beneficiary address (project team wallet)
   - Total: 500,000 QUBIC
   - Add milestones:
     - M1: "Smart Contract Audit" - 150,000 QUBIC
     - M2: "Testnet Launch" - 150,000 QUBIC  
     - M3: "Mainnet Launch" - 200,000 QUBIC
   - Submit

3. **Deposit Funds** (0:35-0:45)
   - View created agreement
   - Click "Deposit Funds"
   - Confirm 500,000 QUBIC deposit
   - See vault status update: Locked = 500,000

4. **Trigger Milestone** (0:45-1:05)
   - In "Oracle Simulator" panel, click "Trigger M1"
   - Simulates: audit report uploaded → webhook → oracle verification
   - Watch milestone status: Pending → Verified → Released
   - See Released amount update to 150,000 QUBIC

5. **Summary** (1:05-1:20)
   - "Pronexma brings trustless milestone-based settlements to Qubic"
   - "Designed as the default vesting layer for Nostromo launches"
   - "Extensible to RWA escrow, B2B payments, and more"

## API Reference

### Agreements

```
POST   /api/agreements              Create new agreement
GET    /api/agreements              List agreements (filter by role)
GET    /api/agreements/:id          Get agreement details
POST   /api/agreements/:id/deposit  Deposit funds into vault
POST   /api/agreements/:id/refund   Request refund (if eligible)
```

### Milestones

```
POST   /api/agreements/:id/milestones/:mid/trigger   Trigger milestone verification
POST   /api/agreements/:id/milestones/:mid/release   Release verified milestone funds
```

### Webhooks

```
POST   /api/webhooks/milestone      External event receiver

Payload:
{
  "agreementId": "AG-001",
  "milestoneId": "M1",
  "source": "github",
  "event": "pr_merged",
  "evidence": {
    "repo": "org/project",
    "pr": 42,
    "commit": "abc123"
  }
}
```

### Health

```
GET    /api/health                  Service health + mode status
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `4000` |
| `DATABASE_URL` | SQLite database path | `file:./dev.db` |
| `RPC_URL` | Qubic RPC endpoint | `http://localhost:8080` |
| `NETWORK_MODE` | `LOCAL_DEV`, `PUBLIC_TESTNET`, `DEMO_OFFCHAIN` | `LOCAL_DEV` |
| `DEMO_MODE` | Force demo mode regardless of RPC | `false` |
| `ORACLE_PRIVATE_KEY` | Key for signing milestone verifications | (required in production) |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:3000` |

## Business Model & Roadmap

### Revenue Model
- **Protocol Fee**: 0.5-1% on settled volume
- **Premium Oracles**: Verified integration partners (auditors, logistics providers)
- **Enterprise API**: Higher rate limits, SLA guarantees

### Roadmap

**Phase 1 (Current)**
- [x] Core vault contract design
- [x] Single-oracle verification
- [x] Demo mode with full simulation
- [x] Web dashboard MVP

**Phase 2**
- [ ] Multi-oracle quorum (M-of-N verification)
- [ ] Direct Nostromo launchpad integration
- [ ] GitHub/GitLab native integrations
- [ ] Mobile-responsive UI

**Phase 3**
- [ ] DAO-governed milestone disputes
- [ ] Multi-currency support (wrapped assets)
- [ ] Formal security audit
- [ ] SDK for third-party integrations

## Testing

```bash
cd backend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

Key test files:
- `agreementService.test.ts` - Agreement lifecycle tests
- `rpcFallback.test.ts` - RPC failure and demo mode fallback tests

## Project Structure

```
pronexma-protocol/
├── README.md
├── docker-compose.yml
├── .env.example
├── scripts/
│   └── start-dev.sh
├── contracts/
│   └── PronexmaVault.cpp
├── docs/
│   └── pitch.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts
│       ├── server.ts
│       ├── config/
│       ├── rpc/
│       ├── models/
│       ├── services/
│       ├── routes/
│       └── tests/
└── frontend/
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    └── src/
        ├── app/
        └── components/
```

## Contributing

This project was built for the **Qubic | Hack the Future – Track 1: Nostromo Launchpad** hackathon.

For contributions:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built for Qubic. Designed for Nostromo. Ready for production.**
