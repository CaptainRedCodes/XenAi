import { Inter } from 'next/font/google'
import "./globals.css";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/context/AuthProvider";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: "Xen-AI ",
  description: "New generated code editor with AI-powered suggestions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          <Provider>
            {/* Header and Footer will be rendered in the Home component instead */}
            <main>{children}</main>
          </Provider>
        </AuthProvider>
      </body>
    </html>
  )
}
