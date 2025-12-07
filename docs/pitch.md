# Pronexma Protocol - Pitch Script

## For Demo Video Narration (60-90 seconds)

---

### Problem (10 seconds)

"Token launches and B2B deals share one critical flaw: trust. Teams raise funds and may never deliver. Invoices get paid before work is verified. The current system relies on hope, not accountability."

### Solution (15 seconds)

"Pronexma is a milestone-based settlement protocol for Qubic. Instead of releasing funds all at once, Pronexma locks them in a smart vault and only releases tranches when real milestones are verified—an audit is passed, code is shipped, a delivery is confirmed."

### How It Works (20 seconds)

"An investor deposits funds into a Pronexma Vault with defined milestones. When the project team completes a milestone—say, they merge a PR or upload an audit report—our oracle backend verifies the event and releases the corresponding funds automatically. No intermediaries. No disputes. Just verifiable progress."

### Tech Architecture (15 seconds)

"Pronexma runs on Qubic's deterministic compute layer. A C++ smart contract holds the vault state. A TypeScript backend handles oracle verification and off-chain events. The web dashboard gives full visibility into every agreement and milestone."

### Why Nostromo Needs This (15 seconds)

"Nostromo is Qubic's official launchpad. Every project that launches needs a trust layer. Pronexma is designed to be that layer—the default vesting and escrow module for every Nostromo raise. We're not just building a demo. We're building infrastructure."

### Call to Action (10 seconds)

"Pronexma: Trustless settlements for the Qubic ecosystem. Lock funds. Verify milestones. Release programmatically."

---

## One-Liner Variations

**For Judges:**
> "Pronexma is the milestone-based escrow layer that turns Nostromo launches from trust-me promises into verifiable commitments."

**For Technical Audience:**
> "A C++ smart vault on Qubic with oracle-verified milestone releases, webhook integrations, and full demo mode for hackathon evaluation."

**For Business Audience:**
> "Programmable Letters of Credit for Web3—funds release when conditions are met, not when someone says so."

---

## Key Differentiators to Emphasize

1. **Protocol, not dashboard** - We move funds, not just display data
2. **Production design** - Built to become Nostromo's standard module
3. **Infra-resilient** - Graceful fallback to demo mode when testnet is flaky
4. **Extensible oracles** - GitHub, invoices, manual—any verification source
5. **Clean UX** - Settlement console aesthetic, not casino vibes

---

## Anticipated Judge Questions

**Q: How is this different from simple time-locked vesting?**
A: Time-locks release funds regardless of progress. Pronexma releases only when verifiable milestones are met—actual accountability, not just delayed access.

**Q: How do you verify off-chain events?**
A: Through our oracle backend that receives webhooks from external systems (GitHub, invoicing SaaS, logistics APIs). In v1, it's centralized but designed for multi-oracle quorum in v2.

**Q: Can this work with real Qubic infrastructure today?**
A: Yes. We've designed for local Qubic Core Lite + RPC. When testnet is unreliable, we gracefully fall back to demo mode with identical UX—showing we understand real-world deployment challenges.

**Q: What's the business model?**
A: Protocol fee (0.5-1%) on settled volume. As Nostromo grows, every launch using Pronexma generates sustainable revenue.
