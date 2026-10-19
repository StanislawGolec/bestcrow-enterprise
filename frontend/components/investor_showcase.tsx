'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ServerOff,
  Zap,
  Calculator,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  Vote,
  Lock,
  Layers,
  Globe,
  FileCheck,
  Percent,
  Coins,
} from 'lucide-react';

const SOL_PRICE_USD = 180;
const AUTO_ROTATE_INTERVAL_MS = 6000;
const PROGRESS_TICK_MS = 50;

export function InvestorShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Slide 1 Calculator State
  const [targetRaise, setTargetRaise] = useState(1500);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-rotation & progress bar effect
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (PROGRESS_TICK_MS / AUTO_ROTATE_INTERVAL_MS) * 100;
        if (next >= 100) {
          setActiveSlide((curr) => (curr + 1) % 4);
          return 0;
        }
        return next;
      });
    }, PROGRESS_TICK_MS);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [isPaused, activeSlide]);

  const handleSelectSlide = (index: number) => {
    setActiveSlide(index);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveSlide((curr) => (curr + 1) % 4);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveSlide((curr) => (curr - 1 + 4) % 4);
    setProgress(0);
  };

  // Fee Calculations
  const traditionalFeeSol = targetRaise * 0.08;
  const traditionalFeeUsd = traditionalFeeSol * SOL_PRICE_USD;
  const traditionalTakeHomeSol = targetRaise - traditionalFeeSol;

  const bestcrowFeeSol = targetRaise * 0.01;
  const bestcrowFeeUsd = bestcrowFeeSol * SOL_PRICE_USD;
  const bestcrowTakeHomeSol = targetRaise - bestcrowFeeSol;

  const savedSol = targetRaise * 0.07;
  const savedUsd = savedSol * SOL_PRICE_USD;

  const slides = [
    {
      id: 0,
      badge: 'Economic Disruption',
      title: '8% vs. 1%: The Crowdfunding Fee Revolution',
      subtitle: 'Interactive Capital Savings Calculator for Founders & Angels',
      icon: Calculator,
    },
    {
      id: 1,
      badge: 'Smart Contract Architecture',
      title: 'Anti-Rug Tranche Escrow + Adaptive Quorum',
      subtitle: 'Eliminating the 37% Failure Rate of Upfront Kickstarter Payouts',
      icon: ShieldCheck,
    },
    {
      id: 2,
      badge: 'Solana L1 Sovereign Guarantee',
      title: '100% Shutdown-Proof & Zero Intermediary',
      subtitle: 'On-Chain Continuity Even if Web Servers Go Dark Forever',
      icon: ServerOff,
    },
    {
      id: 3,
      badge: 'Ultra-High Performance',
      title: 'Built for Global Venture Velocity',
      subtitle: 'Sub-Second Finality, SHA-256 Proofs & Borderless Liquidity',
      icon: Zap,
    },
  ];

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900 shadow-2xl transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Top Banner & Slide Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Investor & Startup Showcase
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Auto-Ad Pitch
                </span>
                {isPaused && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                    Paused on Hover
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white">Why Web3 Milestone Escrow Disrupts Web2 Crowdfunding</p>
            </div>
          </div>

          {/* Slide selector pills & playback controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-800">
              {slides.map((s, idx) => {
                const Icon = s.icon;
                const isActive = activeSlide === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlide(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{idx + 1}.</span>
                    <span>{idx === 0 ? 'Fee Revolution' : idx === 1 ? 'Anti-Rug Escrow' : idx === 2 ? 'Shutdown-Proof' : 'Global Velocity'}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800">
              <button
                onClick={() => setIsPaused(!isPaused)}
                aria-label={isPaused ? 'Resume auto-rotation' : 'Pause auto-rotation'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isPaused ? 'Resume 6s Timer' : 'Pause Auto-Rotation'}
              >
                {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handlePrev}
                aria-label="Previous slide"
                className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                &larr;
              </button>
              <button
                onClick={handleNext}
                aria-label="Next slide"
                className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* 6-second Progress Bar */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800/80">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Carousel Body */}
      <div className="p-6 sm:p-10">
        {/* SLIDE 0: 8% vs 1% FEE REVOLUTION CALCULATOR */}
        {activeSlide === 0 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <Percent className="h-3.5 w-3.5" />
                  {slides[0].badge}
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">{slides[0].title}</h3>
                <p className="text-sm text-slate-400">{slides[0].subtitle}</p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-mono text-slate-300">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span>Reference: 1 SOL ≈ ${SOL_PRICE_USD} USD</span>
              </div>
            </div>

            {/* Interactive Raise Range Slider */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label htmlFor="raise-slider" className="text-sm font-semibold text-slate-200">
                  Simulate Target Startup Raise:
                </label>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400 font-mono">
                    {targetRaise.toLocaleString()} SOL
                  </span>
                  <span className="text-sm text-slate-400 font-mono">
                    ≈ ${(targetRaise * SOL_PRICE_USD).toLocaleString()} USD
                  </span>
                </div>
              </div>

              <input
                id="raise-slider"
                type="range"
                min="100"
                max="10000"
                step="50"
                value={targetRaise}
                onChange={(e) => setTargetRaise(Number(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 mr-1">Presets:</span>
                {[250, 1000, 2500, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTargetRaise(preset)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      targetRaise === preset
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {preset.toLocaleString()} SOL
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Kickstarter / Indiegogo */}
              <div className="rounded-2xl border border-rose-900/40 bg-gradient-to-b from-rose-950/20 to-slate-900/80 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
                      <XCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-base">Kickstarter / Indiegogo</h4>
                      <p className="text-xs text-slate-400">Legacy Web2 Centralized Model</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
                    ~8.0% Total Fee
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-sm">
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Platform Cut (5%):</span>
                    <span className="font-mono text-slate-200">{(targetRaise * 0.05).toFixed(1)} SOL</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Payment Processor (~3% + CC fees):</span>
                    <span className="font-mono text-slate-200">{(targetRaise * 0.03).toFixed(1)} SOL</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Failure Fee Guarantee:</span>
                    <span className="text-rose-400 font-medium">None (Disputes & FX lost)</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-rose-300">Total Lost to Middlemen:</span>
                    <div className="text-right">
                      <p className="font-mono font-bold text-rose-400 text-lg">
                        -{traditionalFeeSol.toFixed(1)} SOL
                      </p>
                      <p className="text-xs text-rose-400/80 font-mono">
                        ≈ -${traditionalFeeUsd.toLocaleString()} USD
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-rose-950/30 p-3 text-xs text-rose-300/90 border border-rose-900/30">
                  Founder receives only <strong className="text-white">{traditionalTakeHomeSol.toFixed(1)} SOL</strong>. Over $
                  {traditionalFeeUsd.toLocaleString()} disappears into bank and payment rails.
                </div>
              </div>

              {/* Bestcrow Protocol */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-slate-900/90 to-slate-900/80 p-6 space-y-5 shadow-lg shadow-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-white text-base">Bestcrow Protocol (Solana L1)</h4>
                      <p className="text-xs text-slate-400">Non-Custodial Milestone Escrow</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    1.0% Success Only
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-sm">
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Protocol Fee (Success):</span>
                    <span className="font-mono text-emerald-400 font-semibold">{bestcrowFeeSol.toFixed(1)} SOL (1.0%)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Payment Processor (Solana Tx):</span>
                    <span className="font-mono text-emerald-400 font-semibold">&lt; 0.0001 SOL (&lt;$0.001)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Failed Campaign Fee:</span>
                    <span className="text-emerald-400 font-bold">0% (100% Pro-Rata Refund)</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-semibold text-emerald-300">Total Protocol Fee:</span>
                    <div className="text-right">
                      <p className="font-mono font-bold text-emerald-400 text-lg">
                        {bestcrowFeeSol.toFixed(1)} SOL
                      </p>
                      <p className="text-xs text-emerald-400/80 font-mono">
                        ≈ ${bestcrowFeeUsd.toLocaleString()} USD
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-950/30 p-3 text-xs text-emerald-300/90 border border-emerald-500/20">
                  Founder receives <strong className="text-white">{bestcrowTakeHomeSol.toFixed(1)} SOL</strong> directly to their treasury via trustless milestone releases.
                </div>
              </div>
            </div>

            {/* Net Savings Callout */}
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Total Builder Value Unlocked
                </span>
                <p className="text-lg font-bold text-white">
                  You save{' '}
                  <span className="text-emerald-400 font-extrabold font-mono text-2xl">
                    +{savedSol.toFixed(1)} SOL
                  </span>{' '}
                  <span className="text-slate-300 font-mono">
                    (+${savedUsd.toLocaleString()} USD)
                  </span>{' '}
                  by launching on Bestcrow
                </p>
                <p className="text-xs text-slate-400">
                  No payment middlemen extracting margins. 100% of saved capital funds engineering, hiring, and audits.
                </p>
              </div>
              <a
                href="/campaign/new"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-300 transition-all"
              >
                Launch with 1% Fee
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* SLIDE 1: ANTI-RUG TRANCHE ESCROW + ADAPTIVE QUORUM */}
        {activeSlide === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                {slides[1].badge}
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">{slides[1].title}</h3>
              <p className="text-sm text-slate-400">{slides[1].subtitle}</p>
            </div>

            {/* Comparison Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-rose-900/40 bg-slate-900/60 p-6 space-y-4">
                <div className="flex items-center gap-2 text-rose-400">
                  <XCircle className="h-5 w-5" />
                  <h4 className="font-bold text-white">The Kickstarter Upfront Trap</h4>
                </div>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl bg-rose-950/20 border border-rose-900/30 p-3">
                    <p className="font-semibold text-rose-300">100% Upfront Payout</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Creator receives all capital on Day 1. Once wired, platforms disclaim all liability.
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-950/20 border border-rose-900/30 p-3">
                    <p className="font-semibold text-rose-300">37% Failure / Abandonment Rate</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Documented academic studies show over 1 in 3 hardware/software crowdfunding projects fail to deliver promised products.
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-950/20 border border-rose-900/30 p-3">
                    <p className="font-semibold text-rose-300">Zero Backer Recourse</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Backers cannot vote, audit intermediate progress, or claw back unspent capital.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4 className="font-bold text-white">Bestcrow Trustless Milestone Protocol</h4>
                </div>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3">
                    <p className="font-semibold text-emerald-300">2 to 5 Immutable PDA Tranches</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Funds are locked in Solana Program Derived Addresses. Only Tranche 1 releases initially; subsequent tranches stay frozen until verified.
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3">
                    <p className="font-semibold text-emerald-300">Adaptive Quorum Governance</p>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong className="text-white">&ge; 25% Turnout Quorum</strong> of total pledged weight + <strong className="text-white">&gt; 50% Active Vote Majority</strong> required to approve evidence proofs.
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3">
                    <p className="font-semibold text-emerald-300">Automated Pro-Rata Refund Guarantee</p>
                    <p className="text-xs text-slate-400 mt-1">
                      If evidence fails or creator goes silent past deadline, remaining PDA escrow automatically unlocks for 100% pro-rata backer claim.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tranche Lifecycle Flow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Visual Milestone Execution Pipeline
              </h4>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                    <span>Tranche 1</span>
                    <span className="font-mono">25%</span>
                  </div>
                  <p className="text-sm font-bold text-white">Seed Architecture</p>
                  <p className="text-xs text-slate-400">Released upon campaign goal success for initial R&D tooling.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Tranche 2</span>
                    <span className="font-mono">25%</span>
                  </div>
                  <p className="text-sm font-bold text-white">Alpha Prototype</p>
                  <p className="text-xs text-slate-400">Gated by SHA-256 Arweave proof and &ge;25% quorum voting.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Tranche 3</span>
                    <span className="font-mono">25%</span>
                  </div>
                  <p className="text-sm font-bold text-white">Production Build</p>
                  <p className="text-xs text-slate-400">Firmware or audited smart contract deployment review.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Tranche 4</span>
                    <span className="font-mono">25%</span>
                  </div>
                  <p className="text-sm font-bold text-white">Final Delivery</p>
                  <p className="text-xs text-slate-400">Deliverables shipped to backers before protocol closure.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: 100% SHUTDOWN-PROOF & ZERO INTERMEDIARY */}
        {activeSlide === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <ServerOff className="h-3.5 w-3.5" />
                {slides[2].badge}
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">{slides[2].title}</h3>
              <p className="text-sm text-slate-400">{slides[2].subtitle}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white">
                    What if Bestcrow’s website and team shut down tomorrow?
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                    <strong className="text-emerald-400">Zero funds are at risk.</strong> Bestcrow operates on autonomous Solana Program Derived Addresses (PDAs). Even in the catastrophic event of a complete web server, DNS, or company shutdown, the Anchor BPF smart contract continues executing uninterrupted on 1,500+ global Solana validator nodes.
                  </p>
                </div>
              </div>

              {/* Architecture Columns */}
              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Layers className="h-4 w-4" />
                    <span>PDA Vault Isolation</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Escrow funds reside in cryptographic accounts derived strictly from <code className="text-emerald-400">[b&quot;campaign&quot;, creator, id]</code>. There are NO multi-sig or team admin keys capable of draining capital.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <Vote className="h-4 w-4" />
                    <span>Direct RPC Voting</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Backers can invoke the <code className="text-cyan-300">vote_milestone</code> instruction directly via Solscan, Solana CLI, or independent community frontends without depending on bestcrow.com.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                    <RotateCcw className="h-4 w-4" />
                    <span>Autonomous Refund Trigger</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If deadline passes without milestone approval, any backer can permissionlessly trigger <code className="text-teal-300">emergency_refund</code> to distribute unspent SOL back to contributor wallets.
                  </p>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>On-Chain Autonomy Status: <strong className="text-white">100% Non-Custodial & Sovereign</strong></span>
                </div>
                <span>BPF Program ID: <code className="text-emerald-400">BestcrowL1PDA...Escrow</code></span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: BUILT FOR GLOBAL VENTURE VELOCITY */}
        {activeSlide === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Zap className="h-3.5 w-3.5" />
                {slides[3].badge}
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">{slides[3].title}</h3>
              <p className="text-sm text-slate-400">{slides[3].subtitle}</p>
            </div>

            {/* 4 Feature Columns */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white font-mono tracking-tight">400ms</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-0.5">Solana Finality</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant pledge settlement and real-time voting confirmations. Eliminates credit card dispute chargebacks entirely.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white font-mono tracking-tight">SHA-256</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-400 mt-0.5">Arweave Proofs</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deliverable audit trails, GitHub commit snapshots, and CAD schematics permanently archived and verified on-chain.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white font-mono tracking-tight">&lt;$0.001</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mt-0.5">Micro-Gas Cost</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Backers participate in governance without spending $20-$80 in Ethereum L1 gas fees. Frictionless micro-pledging.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white font-mono tracking-tight">180+ Ctry</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mt-0.5">Zero Banking Borders</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No SWIFT transfer delays, no 4% foreign exchange gouging, and no geographic exclusion for visionary founders.
                </p>
              </div>
            </div>

            {/* Grand Callout */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-white text-base">Ready to fund or launch without intermediary risk?</p>
                <p className="text-xs text-slate-400">
                  Join founders raising across AI, DePIN, hardware robotics, and developer infrastructure on Solana.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/discover"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Explore Campaigns
                </a>
                <a
                  href="/campaign/new"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20"
                >
                  Launch Now
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
