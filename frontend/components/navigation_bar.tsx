'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStrategy } from './providers';
import { ShieldCheck, Layers, PlusCircle, Compass, Wallet } from 'lucide-react';

export function NavigationBar() {
  const pathname = usePathname();
  const { mode, setMode, activeWallet } = useStrategy();

  const navLinks = [
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/campaign/new', label: 'Start Campaign', icon: PlusCircle },
    { href: '/my-contributions', label: 'My Support', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              B
            </span>
            <span>
              Bestcrow<span className="text-emerald-400">.</span>
            </span>
            <span className="ml-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              ENTERPRISE
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setMode('mock')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'mock'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mock Mode (Instant)
            </button>
            <button
              onClick={() => setMode('devnet')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === 'devnet'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Solana Devnet
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-mono text-slate-300">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            <span>{activeWallet.slice(0, 6)}...{activeWallet.slice(-4)}</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
