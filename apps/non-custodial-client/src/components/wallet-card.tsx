"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"

const API_ENDPOINTS = {
  testnet: "https://api.testnet.hiro.so",
  mainnet: "https://api.hiro.so",
}

export function WalletCard() {
  const { stxAddress, stxPubKey, network, setNetwork, logout } = useAuth()

  const [balance, setBalance] = useState<bigint | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const fetchBalance = useCallback(async () => {
    if (!stxAddress) return

    setIsLoadingBalance(true)
    try {
      const baseUrl = API_ENDPOINTS[network]
      const res = await fetch(
        `${baseUrl}/extended/v1/address/${stxAddress}/balances?unanchored=true`
      )

      if (!res.ok) throw new Error("Failed to fetch balance")

      const data = await res.json()
      setBalance(BigInt(data.stx?.balance || "0"))
    } catch (err) {
      console.error("Error fetching balance:", err)
      setBalance(null)
    } finally {
      setIsLoadingBalance(false)
    }
  }, [stxAddress, network])

  // Fetch balance on mount and when address/network changes
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  if (!stxAddress) return null

  const balanceInSTX = balance !== null ? Number(balance) / 1_000_000 : null

  return (
    <section className="bg-gray-900 rounded-2xl p-6 md:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Wallet</h2>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="space-y-4">
        {/* Balance Display */}
        <div className="p-4 bg-gradient-to-r from-purple-900/50 to-orange-900/50 rounded-lg border border-purple-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">STX Balance</p>
              <p className="text-2xl font-bold text-white">
                {isLoadingBalance ? (
                  <span className="text-gray-400">Loading...</span>
                ) : balanceInSTX !== null ? (
                  `${balanceInSTX.toFixed(6)} STX`
                ) : (
                  <span className="text-gray-400">--</span>
                )}
              </p>
            </div>
            <button
              onClick={fetchBalance}
              disabled={isLoadingBalance}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh balance"
            >
              <svg
                className={`w-5 h-5 ${isLoadingBalance ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Network Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Network
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setNetwork("testnet")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                network === "testnet"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => setNetwork("mainnet")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                network === "mainnet"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Mainnet
            </button>
          </div>
        </div>

        {/* Address Display */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Stacks Address
          </label>
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="font-mono text-sm text-white break-all">{stxAddress}</p>
          </div>
        </div>

        {/* Public Key Display */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Public Key
          </label>
          <div className="p-4 bg-gray-800 rounded-lg">
            <p className="font-mono text-xs text-gray-300 break-all">{stxPubKey}</p>
          </div>
        </div>

        {/* Faucet Link */}
        {network === "testnet" && (
          <a
            href={`https://explorer.hiro.so/sandbox/faucet?chain=testnet&address=${stxAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-purple-400 text-sm transition-colors"
          >
            Get Testnet STX from Faucet
          </a>
        )}
      </div>
    </section>
  )
}
