"use client"

import { useAuth } from "@/contexts/AuthContext"

export function LoginButton() {
  const { isAuthenticated, isLoading, handleLogin } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <section className="bg-gray-900 rounded-2xl p-6 md:p-8 space-y-6">
      <h2 className="text-2xl font-semibold">Connect Wallet</h2>
      <p className="text-gray-400">
        Sign in with Turnkey to create or access your Stacks wallet. Uses passkey
        authentication for secure, passwordless access.
      </p>

      <button
        onClick={handleLogin}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-orange-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-orange-500 transition-all text-lg"
      >
        Sign in with Turnkey
      </button>

      <p className="text-sm text-gray-500 text-center">
        Don&apos;t have a Turnkey account?{" "}
        <a
          href="https://app.turnkey.com"
          className="text-purple-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sign up here
        </a>
      </p>
    </section>
  )
}
