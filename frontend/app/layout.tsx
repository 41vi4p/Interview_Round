import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Header } from "@/components/Header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Rate Board — Currency Converter",
  description:
    "Live currency conversion, 30-day trend, and travel budgeting — Rate Board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Header />
          <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
            {children}
          </main>
          <footer className="border-t border-hairline px-6 py-6 text-center font-mono text-[11px] text-ink-dim">
            Rates refresh via Redis → SQLite → ExchangeRate-API. Trend builds up
            daily — check back over the next month for the full 30-day view.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
