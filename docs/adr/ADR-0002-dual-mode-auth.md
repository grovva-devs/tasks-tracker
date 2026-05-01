---
title: "Dual-mode auth: JWT for internal, signed tokens for public"
date: 2025-04-30
status: Proposed
---

# ADR-0002: Dual-mode Auth — JWT for Internal, Signed Tokens for Public

## Context

Onboarding Tracker has two distinct access patterns:

1. **Internal users** (admin + delivery team) — need persistent sessions, role-based access, and stateful authentication.
2. **Clients** — need to view a single board via a shared link. No account, no login, no session. Click link → see board.

The system must support both without forcing clients through any authentication flow.

## Decision

We will use a **dual-mode authentication strategy**:

- **Internal users**: Email + password → JWT (24h expiry, stored in httpOnly cookie). All internal API endpoints protected by `JwtAuthGuard`.
- **Public board access**: Each board has a `public_token` (32-char cryptographically random string). The public endpoint `GET /boards/public/:token` is protected by `PublicBoardGuard` which validates the token and returns the board. No auth header required.

## Alternatives Considered

### A: All JWT, client gets a "viewer" JWT

- Client receives a JWT after clicking the link (auto-issued)
- **Rejected**: Adds complexity (token issuance endpoint, expiry handling for client tokens). Client just wants to see the board — any extra step is friction.

### B: Magic link / one-time PIN for clients

- Client enters email → receives PIN → accesses board
- **Rejected**: Requires client to have an email and take an extra step. Violates the "click link, see board" requirement.

### C: HTTP Basic Auth with a shared read-only credential

- URL includes `user:pass@` or a shared credential
- **Rejected**: Not user-friendly, credential management is ugly, and browsers handle Basic Auth inconsistently.

### D: Public token in URL (chosen)

- Simple, stateless, no extra step for client
- Token is long enough (32 chars = 192 bits of entropy) to prevent brute force
- Rate limiting adds additional protection

## Consequences

**Positive:**
- Zero friction for clients — click link, see board
- Simple implementation — two guards, two auth paths
- Tokens are revocable (regenerate invalidates old link)
- No client account management overhead
- Public endpoint is easily cacheable (no session state)

**Negative:**
- Anyone with the link can view the board — no per-client restriction
- Token leakage (e.g., forwarded email) means unauthorized access
- No audit trail of who viewed the board (only that the token was used)
- Token rotation is manual (admin action)

**Mitigations:**
- Document token-sharing risks to admins
- Rate limit public endpoint (100 req/min per IP)
- Admin can regenerate token instantly if compromised
- V2 consideration: add optional password protection on public links
- V2 consideration: add view tracking (last accessed, IP) for audit