import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@turnkey/stacks", "@turnkey/react-wallet-kit"],
}

export default nextConfig
