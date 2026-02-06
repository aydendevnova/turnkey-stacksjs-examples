import type { Metadata } from "next"
import { Providers } from "./providers"
import "./globals.css"


export const metadata: Metadata = {
  title: "Turnkey Stacks Demo",
  description: "Demo application for @turnkey/stacks SDK",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
