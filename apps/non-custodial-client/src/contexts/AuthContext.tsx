"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useTurnkey } from "@turnkey/react-wallet-kit"
import { getAddressFromPublicKey, type StacksNetworkType } from "@turnkey/stacks"

// Stacks wallet account configuration
const STACKS_WALLET_ACCOUNT = {
  curve: "CURVE_SECP256K1" as const,
  pathFormat: "PATH_FORMAT_BIP32" as const,
  path: "m/44'/5757'/0'/0/0", // Stacks BIP44 derivation path
  addressFormat: "ADDRESS_FORMAT_COMPRESSED" as const,
}

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean
  isLoading: boolean
  hasWallet: boolean

  // Wallet info
  stxAddress: string | null
  stxPubKey: string | null
  network: StacksNetworkType

  // Turnkey browser client for client-side signing.
  // This is the httpClient from useTurnkey() — its session already scopes
  // operations to the user's sub-org, so no organizationId is needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpClient: any

  // Turnkey functions
  handleLogin: () => void
  logout: () => void
  createStacksWallet: () => Promise<void>
  refreshWallets: () => Promise<unknown>

  // Network toggle
  setNetwork: (network: StacksNetworkType) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const turnkey = useTurnkey()
  const { authState, wallets, httpClient, handleLogin, logout, createWallet, refreshWallets } = turnkey

  const [stxAddress, setStxAddress] = useState<string | null>(null)
  const [stxPubKey, setStxPubKey] = useState<string | null>(null)
  const [network, setNetwork] = useState<StacksNetworkType>("testnet")
  const [isLoading, setIsLoading] = useState(true)

  const hasWallet = wallets && wallets.length > 0 && wallets[0]?.accounts?.length > 0

  // Derive STX address from wallet public key using @turnkey/stacks
  useEffect(() => {
    const account = wallets?.[0]?.accounts?.[0]
    const pubKey = account?.publicKey

    if (pubKey) {
      setStxPubKey(pubKey)
      try {
        const address = getAddressFromPublicKey(pubKey, network)
        setStxAddress(address)
        console.log("[AuthContext] Wallet derived:", {
          publicKey: pubKey,
          address,
          network,
        })
      } catch (err) {
        console.error("[AuthContext] Failed to derive STX address:", err)
        setStxAddress(null)
      }
    } else {
      setStxAddress(null)
      setStxPubKey(null)
    }
  }, [wallets, network])

  // Update loading state
  useEffect(() => {
    if (authState === "authenticated" || authState === "unauthenticated") {
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [authState])

  // Create a Stacks-compatible wallet
  async function createStacksWallet() {
    await createWallet({
      walletName: "Stacks Wallet",
      accounts: [STACKS_WALLET_ACCOUNT],
    })
    await refreshWallets()
  }

  const value: AuthContextType = {
    isAuthenticated: authState === "authenticated",
    isLoading,
    hasWallet: !!hasWallet,
    stxAddress,
    stxPubKey,
    network,
    httpClient: httpClient ?? null,
    handleLogin,
    logout,
    createStacksWallet,
    refreshWallets,
    setNetwork,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
