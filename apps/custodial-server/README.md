# Custodial Server Demo

Server-side STX transfer demo using `@turnkey/stacks` with `@turnkey/sdk-server`.

This demonstrates the **custodial** model: the server owns a wallet in the Turnkey parent organization and signs transactions using API key credentials. No browser, no user authentication, no sub-organizations.

## Setup

1. **Copy the env file and fill in your credentials:**

   ```bash
   cp .env.example .env
   ```

2. **Create a wallet in your Turnkey parent organization:**

   - Go to [app.turnkey.com](https://app.turnkey.com) → Wallets → Create Wallet
   - Add an account: Compressed, secp256k1, BIP-32
   - Copy the public key → set as `SERVER_WALLET_PUBLIC_KEY` in `.env`

3. **Fund the testnet address:**

   ```bash
   pnpm demo -- --info    # shows the derived testnet address
   ```

   Use the [Stacks testnet faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet) to send STX to that address.

4. **Install dependencies:**

   ```bash
   pnpm install
   ```

## Usage

```bash
# Interactive mode — prompts for recipient and amount
pnpm demo

# Direct arguments
pnpm demo -- --recipient ST2J6ZY... --amount 1.0

# Dry run — signs the transaction but does not broadcast
pnpm demo -- --dry-run --recipient ST2J6ZY... --amount 0.5

# Wallet info only
pnpm demo -- --info
```

## What This Proves

- `@turnkey/stacks` works with `@turnkey/sdk-server` (Node.js, no browser)
- `organizationId` is correctly forwarded to Turnkey's `signRawPayload`
- Transaction construction, hash generation, and VRS signature assembly produce valid signed transactions
- The signed transaction is accepted and broadcast by the Stacks testnet

## Comparison with Non-Custodial Client Demo

| | Custodial Server | Non-Custodial Client |
|---|---|---|
| Where signing happens | Server (Node.js) | Browser |
| Turnkey client | `@turnkey/sdk-server` apiClient | `httpClient` from `useTurnkey()` |
| Who owns the wallet | Server (parent org) | User (sub-org) |
| `organizationId` | Required (parent org ID) | Omitted (session-scoped) |
| API keys needed | Yes | No |
| User authentication | Not needed for signing | Required (email OTP, passkey, etc.) |
