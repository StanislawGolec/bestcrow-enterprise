import type { Metadata } from 'next';
import './globals.css';
import { StrategyProvider } from '../components/providers';
import { NavigationBar } from '../components/navigation_bar';

export const metadata: Metadata = {
  title: 'Bestcrow Enterprise | Non-Custodial Milestone Escrow on Solana',
  description: 'Enterprise milestone escrow crowdfunding platform for early-stage startup prototypes on Solana.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        <StrategyProvider>
          <NavigationBar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>Bestcrow Enterprise Protocol • Solana BPF & Kubernetes Cloud-Native</p>
              <p>Engineered for High-Assurance Startup Financing</p>
            </div>
          </footer>
        </StrategyProvider>
      </body>
    </html>
  );
}
