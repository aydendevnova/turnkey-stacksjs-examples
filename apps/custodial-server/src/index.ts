/**
 * Custodial Server Demo
 *
 * Demonstrates server-side STX transfers using @turnkey/stacks with
 * @turnkey/sdk-server. The server owns a wallet in the parent Turnkey
 * organization and signs transactions using API key credentials.
 *
 * This is the custodial model: the server controls the signing key,
 * and users trust the server to manage funds on their behalf.
 *
 * Usage:
 *   pnpm demo                                          # interactive prompts
 *   pnpm demo -- --recipient ST2J6ZY... --amount 1.0   # direct args
 *   pnpm demo -- --dry-run                              # sign but don't broadcast
 *   pnpm demo -- --info                                 # show wallet info only
 *
 * Required env vars (in .env or exported):
 *   TURNKEY_API_PUBLIC_KEY
 *   TURNKEY_API_PRIVATE_KEY
 *   TURNKEY_ORGANIZATION_ID
 *   SERVER_WALLET_PUBLIC_KEY
 */

import "dotenv/config"
import { Turnkey } from "@turnkey/sdk-server"
import {
  TurnkeySigner,
  broadcastTransaction,
  getAddressFromPublicKey,
} from "@turnkey/stacks"
import * as readline from "readline"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface Config {
  apiBaseUrl: string
  apiPublicKey: string
  apiPrivateKey: string
  organizationId: string
  serverWalletPublicKey: string
}

function loadConfig(): Config {
  const required = (key: string): string => {
    const value = process.env[key]
    if (!value) {
      console.error(`\nMissing required environment variable: ${key}`)
      console.error("See .env.example for the full list.\n")
      process.exit(1)
    }
    return value
  }

  return {
    apiBaseUrl: process.env.TURNKEY_BASE_URL || "https://api.turnkey.com",
    apiPublicKey: required("TURNKEY_API_PUBLIC_KEY"),
    apiPrivateKey: required("TURNKEY_API_PRIVATE_KEY"),
    organizationId: required("TURNKEY_ORGANIZATION_ID"),
    serverWalletPublicKey: required("SERVER_WALLET_PUBLIC_KEY"),
  }
}

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  recipient?: string
  amount?: string
  memo?: string
  dryRun: boolean
  infoOnly: boolean
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const result: CliArgs = { dryRun: false, infoOnly: false }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--recipient":
        result.recipient = args[++i]
        break
      case "--amount":
        result.amount = args[++i]
        break
      case "--memo":
        result.memo = args[++i]
        break
      case "--dry-run":
        result.dryRun = true
        break
      case "--info":
        result.infoOnly = true
        break
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Interactive Prompts
// ---------------------------------------------------------------------------

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// ---------------------------------------------------------------------------
// Balance Check
// ---------------------------------------------------------------------------

async function fetchBalance(address: string): Promise<bigint> {
  const url = `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
  const res = await fetch(url)
  if (!res.ok) return 0n
  const data = (await res.json()) as { stx?: { balance?: string } }
  return BigInt(data.stx?.balance ?? "0")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60))
  console.log("  @turnkey/stacks — Custodial Server Demo")
  console.log("=".repeat(60))
  console.log()

  // Load config
  const config = loadConfig()
  const args = parseArgs()

  // Initialize Turnkey server SDK
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl,
    apiPrivateKey: config.apiPrivateKey,
    apiPublicKey: config.apiPublicKey,
    defaultOrganizationId: config.organizationId,
  })

  // Create signer with the server wallet (lives in the parent org)
  const signer = new TurnkeySigner({
    client: turnkey.apiClient(),
    organizationId: config.organizationId,
    publicKey: config.serverWalletPublicKey,
    network: "testnet",
  })

  const address = signer.getAddress("testnet")
  const balance = await fetchBalance(address)

  console.log("  Server Wallet")
  console.log("  ─────────────")
  console.log(`  Address:    ${address}`)
  console.log(`  Public Key: ${signer.getPublicKey().slice(0, 20)}...`)
  console.log(`  Balance:    ${(Number(balance) / 1_000_000).toFixed(6)} STX`)
  console.log(`  Org ID:     ${config.organizationId.slice(0, 16)}...`)
  console.log()

  // Info-only mode: just show wallet details and exit
  if (args.infoOnly) {
    console.log("  Mainnet address: ", getAddressFromPublicKey(config.serverWalletPublicKey, "mainnet"))
    console.log("  Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet")
    console.log()
    return
  }

  // Check balance
  if (balance === 0n) {
    console.log("  WARNING: Wallet has zero balance.")
    console.log("  Fund it via: https://explorer.hiro.so/sandbox/faucet?chain=testnet")
    console.log(`  Address to fund: ${address}`)
    console.log()

    const proceed = await prompt("  Continue anyway? (y/N): ")
    if (proceed.toLowerCase() !== "y") {
      console.log("  Aborted.")
      return
    }
    console.log()
  }

  // Get transfer parameters
  const recipient = args.recipient || await prompt("  Recipient address (ST...): ")
  if (!recipient) {
    console.error("  Error: Recipient address is required.")
    process.exit(1)
  }

  const amountStr = args.amount || await prompt("  Amount in STX (e.g. 1.0): ")
  const amountSTX = parseFloat(amountStr)
  if (isNaN(amountSTX) || amountSTX <= 0) {
    console.error("  Error: Amount must be a positive number.")
    process.exit(1)
  }
  const amountMicroSTX = BigInt(Math.floor(amountSTX * 1_000_000))

  const memo = args.memo || await prompt("  Memo (optional, press Enter to skip): ") || undefined

  console.log()
  console.log("  Transfer Details")
  console.log("  ────────────────")
  console.log(`  From:   ${address}`)
  console.log(`  To:     ${recipient}`)
  console.log(`  Amount: ${amountSTX} STX (${amountMicroSTX} microSTX)`)
  if (memo) console.log(`  Memo:   ${memo}`)
  if (args.dryRun) console.log(`  Mode:   DRY RUN (sign only, no broadcast)`)
  console.log()

  // Sign the transaction
  console.log("  Signing transaction with Turnkey...")
  const startSign = Date.now()

  const { transaction, nonce, fee } = await signer.signSTXTransfer({
    recipient,
    amount: amountMicroSTX,
    memo,
    network: "testnet",
  })

  const signMs = Date.now() - startSign
  console.log(`  Signed in ${signMs}ms (nonce: ${nonce}, fee: ${fee} microSTX)`)

  // Dry run: skip broadcast
  if (args.dryRun) {
    console.log()
    console.log("  DRY RUN complete. Transaction was signed but not broadcast.")
    console.log("  The signing pipeline (build tx → hash → signRawPayload → VRS) is verified.")
    console.log()
    return
  }

  // Broadcast
  console.log("  Broadcasting to Stacks testnet...")
  const startBroadcast = Date.now()

  const txid = await broadcastTransaction(transaction, "testnet")

  const broadcastMs = Date.now() - startBroadcast
  console.log(`  Broadcast in ${broadcastMs}ms`)
  console.log()
  console.log("  SUCCESS")
  console.log("  ───────")
  console.log(`  TX ID:    ${txid}`)
  console.log(`  Explorer: https://explorer.hiro.so/txid/${txid}?chain=testnet`)
  console.log()
}

main().catch((err) => {
  console.error()
  console.error("  FAILED:", err instanceof Error ? err.message : err)
  if (err instanceof Error && err.message.includes("Could not find any resource to sign with")) {
    console.error()
    console.error("  This means Turnkey cannot find the signing key in the specified organization.")
    console.error("  Verify that SERVER_WALLET_PUBLIC_KEY is a wallet created in your parent org")
    console.error("  (via the Turnkey dashboard), not a sub-org wallet from react-wallet-kit.")
  }
  console.error()
  process.exit(1)
})
