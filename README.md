# Turnkey Stacks Monorepo

Monorepo containing the `@turnkey/stacks` SDK and demo application.

## Structure

```
turnkey-stacks-monorepo/
├── packages/
│   └── stacks/          # @turnkey/stacks SDK (git submodule)
├── apps/
│   └── demo/            # Next.js demo application
├── pnpm-workspace.yaml
└── package.json
```

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

# Run the demo app
pnpm dev
```

The demo will be available at `http://localhost:3000`.

### Building

```bash
# Build everything
pnpm build
```

## Packages

### @turnkey/stacks

Turnkey signer for Stacks blockchain transactions. See [packages/stacks/README.md](packages/stacks/README.md) for documentation.

### Demo App

Next.js application demonstrating the SDK functionality:
- Address derivation from public keys
- Transaction signing UI (requires Turnkey credentials)

## Deployment

### Vercel

This monorepo is configured for Vercel deployment:

1. Connect the repository to Vercel
2. Set **Root Directory** to `apps/demo`
3. Vercel will automatically detect Next.js and configure the build

Alternatively, use the provided `vercel.json` configuration.

### Environment Variables

For the demo to fully function, set these in your Vercel project:

```
NEXT_PUBLIC_TURNKEY_API_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=your-org-id
```

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
