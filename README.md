# Turnkey Stacks Monorepo

Monorepo containing the `@turnkey/stacks` SDK and two reference applications demonstrating custodial and non-custodial Stacks wallet architectures using Turnkey.

## Structure

```
turnkey-stacks-monorepo/
├── packages/
│   └── stacks/                  # @turnkey/stacks SDK (git submodule)
├── apps/
│   ├── non-custodial-client/    # Next.js — user-owned wallets
│   └── custodial-server/        # Express — server-owned wallet
├── pnpm-workspace.yaml
└── package.json
```

## Apps

### Non-Custodial Client (`apps/non-custodial-client`)

Each user gets their own wallet inside their own Turnkey sub-organization. Signing happens in the browser — the application never touches private keys. On-chain, every user has a distinct address with its own balance. This is the model for wallet apps, DeFi frontends, or any "connect your wallet" experience.

### Custodial Server (`apps/custodial-server`)

A single wallet owned and operated by the server. On-chain there is one address; in theory per-user accounting would be handled entirely off-chain via an internal ledger. When a user requests a withdrawal, the server decides whether to approve it and signs from the master wallet. This is how centralized exchanges, rewards platforms, and payment services work under the hood.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 10.0.0

### Installation

```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Or if already cloned, init submodules
git submodule update --init --recursive

# Install dependencies
pnpm install
```

### Development

```bash
# Build the SDK package first
pnpm build:packages

# Run the non-custodial client
pnpm dev

# Run the custodial server
pnpm dev:server
```

## Packages

### @turnkey/stacks

Turnkey signer for Stacks blockchain transactions. See [packages/stacks/README.md](packages/stacks/README.md) for documentation.

## Git Submodules

The `@turnkey/stacks` package is included as a git submodule. To update:

```bash
cd packages/stacks
git pull origin main
cd ../..
git add packages/stacks
git commit -m "chore: update @turnkey/stacks submodule"
```

## License

Apache-2.0
