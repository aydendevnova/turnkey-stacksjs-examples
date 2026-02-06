"use client"

import { LoginButton } from "@/components/login-button"
import { CreateWallet } from "@/components/create-wallet"
import { WalletCard } from "@/components/wallet-card"
import { TransferForm } from "@/components/transfer-form"
import { useAuth } from "@/contexts/AuthContext"

export default function Home() {
  const { isAuthenticated, isLoading, hasWallet } = useAuth()

  return (
    <main className="min-h-screen p-8 md:p-16 lg:p-24">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
            @turnkey/stacks
          </h1>
          <p className="text-lg text-gray-400">
            Turnkey wallet integration for Stacks blockchain
          </p>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          </div>
        )}

        {/* Not authenticated - show login */}
        {!isLoading && !isAuthenticated && <LoginButton />}

        {/* Authenticated but no wallet - show create wallet */}
        {!isLoading && isAuthenticated && !hasWallet && <CreateWallet />}

        {/* Authenticated with wallet - show wallet and transfer */}
        {!isLoading && isAuthenticated && hasWallet && (
          <>
            <WalletCard />
            <TransferForm />
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm pt-8">
          <p>
            Built with{" "}
            <a
              href="https://turnkey.com"
              className="text-purple-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Turnkey
            </a>{" "}
            and{" "}
            <a
              href="https://www.stacks.co"
              className="text-orange-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stacks
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
