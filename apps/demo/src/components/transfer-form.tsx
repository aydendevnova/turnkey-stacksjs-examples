"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { TurnkeySigner, broadcastTransaction } from "@turnkey/stacks"

interface TransferResult {
  txid: string
  senderAddress: string
  recipient: string
  amount: string
}

export function TransferForm() {
  const { isAuthenticated, stxPubKey, httpClient, network } = useAuth()

  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TransferResult | null>(null)

  if (!isAuthenticated) return null

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setIsLoading(true)

    try {
      if (!httpClient) {
        throw new Error("Turnkey client not ready. Please wait for authentication to complete.")
      }
      if (!stxPubKey) {
        throw new Error("No wallet found. Please create a Stacks wallet first.")
      }

      const amountMicroSTX = BigInt(Math.floor(parseFloat(amount) * 1_000_000))

      // Create signer using the browser's httpClient.
      // No organizationId needed — the session already scopes to the user's sub-org.
      const signer = new TurnkeySigner({
        client: httpClient,
        publicKey: stxPubKey,
        network,
      })

      const senderAddress = signer.getAddress(network)

      console.log("[transfer] Client-side signing:", {
        senderAddress,
        senderPubKey: stxPubKey.slice(0, 16) + "...",
        recipient: recipient.slice(0, 16) + "...",
        amount: amountMicroSTX.toString(),
        network,
      })

      // Sign the STX transfer client-side
      const { transaction, nonce, fee } = await signer.signSTXTransfer({
        recipient,
        amount: amountMicroSTX,
        memo: memo || undefined,
        network,
      })

      // Broadcast
      const txid = await broadcastTransaction(transaction, network)

      console.log("[transfer] Broadcast success:", { txid, senderAddress })

      setResult({
        txid,
        senderAddress,
        recipient,
        amount: amountMicroSTX.toString(),
      })
      setRecipient("")
      setAmount("")
      setMemo("")
    } catch (err) {
      console.error("[transfer] Error:", err)
      setError(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsLoading(false)
    }
  }

  const explorerUrl = "https://explorer.hiro.so/txid"

  return (
    <section className="bg-gray-900 rounded-2xl p-6 md:p-8 space-y-6">
      <h2 className="text-2xl font-semibold">Send STX</h2>
      <p className="text-gray-400">
        Transfer STX from your wallet using Turnkey&apos;s client-side signing.
      </p>

      <form onSubmit={handleTransfer} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={network === "testnet" ? "ST..." : "SP..."}
            required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount (STX)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
            step="0.000001"
            min="0.000001"
            required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Memo (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Payment for services"
            maxLength={34}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !httpClient || !stxPubKey}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing & Broadcasting..." : "Send STX"}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-900/50 border border-green-700 rounded-lg space-y-2">
          <p className="text-green-400 font-medium">Transaction Submitted!</p>
          <div className="text-sm text-green-300 space-y-1">
            <p>
              <span className="text-green-400">From:</span>{" "}
              <span className="font-mono text-xs">{result.senderAddress}</span>
            </p>
            <p>
              <span className="text-green-400">Amount:</span>{" "}
              {(parseInt(result.amount) / 1_000_000).toFixed(6)} STX
            </p>
            <p>
              <span className="text-green-400">To:</span>{" "}
              <span className="font-mono text-xs">{result.recipient}</span>
            </p>
            <p>
              <span className="text-green-400">TX ID:</span>{" "}
              <a
                href={`${explorerUrl}/${result.txid}?chain=${network}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline"
              >
                {result.txid.slice(0, 20)}...
              </a>
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
