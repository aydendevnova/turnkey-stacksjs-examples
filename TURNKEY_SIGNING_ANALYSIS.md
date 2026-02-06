# Turnkey Stacks Signing: Complete Flow

This document describes the end-to-end signing flow used by the `@turnkey/stacks` package and the demo application. The working architecture is client-side signing, where the user's browser signs transactions directly using Turnkey's `httpClient` without any server-side API keys or routes.

---

## 1. Turnkey Organization Model

Turnkey uses a hierarchical organization structure. Every Turnkey account has a **parent organization**, identified by the organization ID set in the Turnkey dashboard. When a user authenticates through `@turnkey/react-wallet-kit` (via email OTP, passkey, OAuth, etc.), Turnkey creates a **sub-organization** for that user. The sub-org is an isolated container that holds the user's wallets and private keys. The parent organization never has direct access to sub-org keys; the sub-org is sovereign.

The parent organization ID is a configuration value (`NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID`) used only to initialize the `TurnkeyProvider`. It tells the SDK which Turnkey account to authenticate against. After authentication, all operations run within the user's sub-org, not the parent.

---

## 2. Application Initialization

The entry point is `providers.tsx`, which wraps the application in two nested context providers.

**`TurnkeyProvider`** (from `@turnkey/react-wallet-kit`) is configured with the parent organization ID and an auth proxy config ID. It handles authentication UI (email OTP in this demo), session management, and exposes the `useTurnkey()` hook. The auth proxy config ID references a Turnkey dashboard configuration that defines how the auth proxy creates sub-organizations and handles credentials.

**`AuthProvider`** (custom) wraps `useTurnkey()` and extracts the values the application needs: authentication state, wallet data, the `httpClient`, and derived Stacks-specific data like the STX address and public key.

```
TurnkeyProvider (parent org config, auth proxy config)
  └─ AuthProvider (extracts httpClient, wallets, derives STX address)
       └─ App components (TransferForm, WalletCard, etc.)
```

---

## 3. Authentication and Wallet Creation

When the user clicks "Log in," `react-wallet-kit` presents an authentication modal (email OTP in this demo's configuration). After the user completes authentication, Turnkey's auth proxy creates a sub-organization for the user if one does not already exist, establishes a browser session scoped to that sub-org, and returns the session to the SDK.

After authentication, `useTurnkey()` exposes:
- `authState`: `"authenticated"`
- `httpClient`: A `TurnkeySDKClientBase` instance whose session is bound to the user's sub-org. Every API call made through this client automatically targets the correct sub-org without the caller needing to specify an organization ID.
- `wallets`: Array of wallets in the user's sub-org (initially empty for new users).
- `session`: Contains `organizationId` (the sub-org ID) and `userId`.

If the user has no wallet, the app prompts them to create one. `AuthContext.createStacksWallet()` calls `createWallet()` with the Stacks-specific account configuration:

```typescript
{
  curve: "CURVE_SECP256K1",        // secp256k1 elliptic curve (same as Bitcoin)
  pathFormat: "PATH_FORMAT_BIP32", // BIP-32 hierarchical deterministic path
  path: "m/44'/5757'/0'/0/0",     // BIP-44 path for Stacks (coin type 5757)
  addressFormat: "ADDRESS_FORMAT_COMPRESSED", // 33-byte compressed public key
}
```

This creates a wallet inside the user's sub-org with one account. The account's `publicKey` is a 66-character hex string (compressed secp256k1 public key, prefixed with `02` or `03`).

---

## 4. Address Derivation

Once the wallet exists, `AuthContext` reads `wallets[0].accounts[0].publicKey` and derives the Stacks address using `getAddressFromPublicKey()` from `@turnkey/stacks`. This function validates the public key format (compressed, 33 bytes, correct prefix), normalizes it to lowercase hex, and calls `publicKeyToAddress()` from `@stacks/transactions` to produce the address. Testnet addresses start with `ST`, mainnet with `SP`.

The derived address and public key are stored in React state (`stxAddress`, `stxPubKey`) and exposed through the `useAuth()` hook.

---

## 5. Transaction Signing (Client-Side)

When the user submits a transfer in `TransferForm`, the entire signing process runs in the browser. No server API route is involved.

### Step 5a: Create TurnkeySigner

```typescript
const signer = new TurnkeySigner({
  client: httpClient,    // browser client, session-scoped to sub-org
  publicKey: stxPubKey,  // from wallets[0].accounts[0].publicKey
  network,               // "testnet" or "mainnet"
})
```

`organizationId` is intentionally omitted. The `httpClient`'s session already scopes all API calls to the user's sub-org. Passing an explicit `organizationId` would override this scoping — if the parent org ID were passed, Turnkey would look for the key in the parent org where it does not exist, producing the `Turnkey error 5: Could not find any resource to sign with` error.

### Step 5b: Build Unsigned Transaction

`signer.signSTXTransfer()` internally calls `makeUnsignedSTXTokenTransfer()` from `@stacks/transactions`:

```typescript
const transaction = await makeUnsignedSTXTokenTransfer({
  recipient,                    // destination Stacks address
  amount,                       // microSTX (bigint)
  publicKey: compressedPublicKey, // sender's public key
  nonce,                        // fetched from Hiro API if not provided
  fee,                          // defaults to 180 microSTX
  network,                      // "testnet" or "mainnet"
  memo,                         // optional, max 34 bytes
})
```

The nonce is auto-fetched from the Hiro API (`/extended/v1/address/{address}/nonces`) if not explicitly provided. The returned `possible_next_nonce` value accounts for pending transactions.

### Step 5c: Generate Pre-Sign Hash

Stacks transactions use a two-phase signing process. First, a signing hash is generated from the unsigned transaction:

```typescript
const txSigner = new TransactionSigner(transaction)
const preSignHash = sigHashPreSign(
  txSigner.sigHash,                               // initial hash of the transaction body
  transaction.auth.authType,                       // single-sig standard auth
  transaction.auth.spendingCondition.fee,          // fee
  transaction.auth.spendingCondition.nonce         // nonce
)
```

`sigHashPreSign` combines the transaction body hash with the auth type, fee, and nonce to produce the final 32-byte hash that must be signed. This hash is deterministic — given the same transaction parameters, it always produces the same output.

### Step 5d: Sign with Turnkey

The pre-sign hash is sent to Turnkey's `signRawPayload` API through the browser client:

```typescript
const request = {
  signWith: compressedPublicKey,          // identifies which key to sign with
  payload: `0x${preSignHash}`,            // the hash to sign
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP",    // Turnkey must NOT re-hash
}
// organizationId is NOT included — session handles scoping

const { v, r, s } = await httpClient.signRawPayload(request)
```

`HASH_FUNCTION_NO_OP` is critical. The Stacks `sigHashPreSign` function already produced the final hash. If Turnkey were to apply an additional hash (e.g., SHA-256), the resulting signature would be over the wrong data and the Stacks node would reject the transaction.

`signWith` accepts the compressed public key. Turnkey matches this against the accounts in the user's sub-org to locate the corresponding private key. The private key never leaves Turnkey's infrastructure; Turnkey performs the ECDSA signing operation and returns only the signature components.

The returned `v`, `r`, `s` values are the standard ECDSA signature components:
- `v`: Recovery byte (0 or 1), indicating which of the two possible public keys corresponds to the signature
- `r`: 32-byte x-coordinate of the ephemeral key point (hex string)
- `s`: 32-byte signature scalar (hex string)

### Step 5e: Construct VRS Signature

Stacks expects a 65-byte signature in VRS format (recovery byte first, then r, then s):

```typescript
const v = normalizeRecoveryByte(signature.v) // ensure "00" or "01"
const r = signature.r.padStart(64, "0")      // pad to 32 bytes
const s = signature.s.padStart(64, "0")      // pad to 32 bytes
const vrs = `${v}${r}${s}`                   // 130 hex chars = 65 bytes
```

### Step 5f: Attach Signature to Transaction

The VRS string is wrapped in a `MessageSignature` and attached to the transaction's spending condition:

```typescript
const spendingCondition = transaction.auth.spendingCondition as SingleSigSpendingCondition
spendingCondition.signature = createMessageSignature(vrs)
```

At this point, `transaction` is a fully signed `StacksTransactionWire` ready for broadcast.

---

## 6. Broadcasting

The signed transaction is broadcast to the Stacks network via the Hiro API:

```typescript
const txid = await broadcastTransaction(transaction, network)
```

This calls `broadcastTransaction` from `@stacks/transactions`, which serializes the transaction and POSTs it to the appropriate network endpoint (`https://api.testnet.hiro.so` or `https://api.hiro.so`). The returned `txid` is the transaction's unique identifier on the network.

---

## 7. Why organizationId Must Be Omitted for Browser Clients

When a user authenticates through `react-wallet-kit`, the SDK establishes an HTTP session (via session tokens stored in the browser) that is bound to the user's sub-organization. Every API call made through `httpClient` automatically includes the session credentials, which Turnkey's backend resolves to the correct sub-org.

The `signRawPayload` API accepts an optional `organizationId` parameter. When provided, it overrides the session's org scoping. If the caller passes the parent organization ID, Turnkey searches for the public key in the parent org — where the user's key does not exist — and returns `error 5: Could not find any resource to sign with`.

The `TurnkeySigner` class handles this correctly: `organizationId` is optional in the config, and `signHash` only includes it in the request when explicitly set. Browser callers omit it; server callers (using `@turnkey/sdk-server` with API keys) provide it.

---

## 8. Package Exports

The `@turnkey/stacks` package exports:

| Export | Type | Purpose |
|--------|------|---------|
| `TurnkeySigner` | Class | Core signer: builds, signs, and returns Stacks transactions |
| `getAddressFromPublicKey` | Function | Derives a Stacks address from a compressed public key |
| `broadcastTransaction` | Function | Broadcasts a signed transaction to the Stacks network |
| `signAndBroadcastSTXTransfer` | Function | Convenience: signs and broadcasts in one call |
| `TurnkeySignerConfig` | Type | Configuration for `TurnkeySigner` constructor |
| `TurnkeySignerClient` | Type | Minimal interface that `client` must satisfy (`signRawPayload`) |
| `STXTransferParams` | Type | Parameters for `signSTXTransfer` |
| `SignedTransactionResult` | Type | Return type from `signSTXTransfer` |
| `BroadcastResult` | Type | Return type from `signAndBroadcastSTXTransfer` |
| `StacksNetworkType` | Type | `"testnet" \| "mainnet"` |

---

## 9. Environment Variables

The demo requires only two environment variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID` | Parent organization ID. Used by `TurnkeyProvider` to initialize the SDK and route authentication. |
| `NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID` | Auth proxy configuration ID. References the Turnkey dashboard config that defines how sub-orgs are created during authentication. |

No server-side API keys (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`) are required for client-side signing. No `TURNKEY_SIGNER_PUBLIC_KEY` is needed because the user signs with their own wallet, not a server-owned wallet.

---

## 10. File Map

| File | Role |
|------|------|
| `packages/stacks/src/types.ts` | Type definitions: `TurnkeySignerConfig`, `TurnkeySignerClient`, `STXTransferParams`, etc. |
| `packages/stacks/src/index.ts` | `TurnkeySigner` class, `getAddressFromPublicKey`, `broadcastTransaction`, `signAndBroadcastSTXTransfer` |
| `apps/demo/src/app/providers.tsx` | `TurnkeyProvider` + `AuthProvider` initialization |
| `apps/demo/src/contexts/AuthContext.tsx` | Extracts `httpClient`, `wallets`, derives `stxAddress`/`stxPubKey`, exposes `useAuth()` |
| `apps/demo/src/components/transfer-form.tsx` | Client-side STX transfer: creates `TurnkeySigner`, signs, broadcasts |
| `apps/demo/src/components/wallet-card.tsx` | Displays wallet info, balance, network toggle |
| `apps/demo/src/components/create-wallet.tsx` | Prompts user to create a Stacks wallet if none exists |
| `apps/demo/src/components/login-button.tsx` | Triggers `handleLogin` from auth context |
