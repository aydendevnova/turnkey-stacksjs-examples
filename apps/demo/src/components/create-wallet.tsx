"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

export function CreateWallet() {
  const { createStacksWallet } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setIsCreating(true)
    setError(null)

    try {
      await createStacksWallet()
    } catch (err) {
      console.error("Failed to create wallet:", err)
      setError(err instanceof Error ? err.message : "Failed to create wallet")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="bg-gray-900 rounded-2xl p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl">
          +
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Create Your Stacks Wallet</h2>
            <p className="text-gray-400 mt-2">
              You need a Stacks wallet to send transactions. It&apos;s secure,
              non-custodial, and only takes seconds to set up.
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating Wallet..." : "Create Wallet"}
          </button>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
