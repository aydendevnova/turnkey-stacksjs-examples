"use client"

import { TurnkeyProvider, TurnkeyProviderConfig } from "@turnkey/react-wallet-kit"
import "@turnkey/react-wallet-kit/styles.css"
import { AuthProvider } from "@/contexts/AuthContext"

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
  authProxyConfigId: process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID!,
  auth: {
    methods: {
      passkeyAuthEnabled: false,
      emailOtpAuthEnabled: true,
      // smsOtpAuthEnabled: true,
      // googleOauthEnabled: true,
      // appleOauthEnabled: true,
    },
  },
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider config={turnkeyConfig}>
      <AuthProvider>{children}</AuthProvider>
    </TurnkeyProvider>
  )
}
