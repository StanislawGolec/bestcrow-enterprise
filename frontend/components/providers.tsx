'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { OperatingMode } from '../lib/types';
import { TransactionStrategy } from '../lib/strategies/transaction_strategy';
import { MockTransactionStrategy } from '../lib/strategies/mock_strategy';
import { DevnetTransactionStrategy } from '../lib/strategies/devnet_strategy';
import { MOCK_STORAGE_KEYS } from '../lib/constants';

interface StrategyContextValue {
  mode: OperatingMode;
  setMode: (mode: OperatingMode) => void;
  strategy: TransactionStrategy;
  activeWallet: string;
  setActiveWallet: (wallet: string) => void;
}

const StrategyContext = createContext<StrategyContextValue | null>(null);

const DEFAULT_WALLET = 'DemoUserWallet111111111111111111111111111111';

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<OperatingMode>('mock');
  const [activeWallet, setActiveWalletState] = useState<string>(DEFAULT_WALLET);

  useEffect(() => {
    const savedMode = localStorage.getItem(MOCK_STORAGE_KEYS.MODE) as OperatingMode | null;
    if (savedMode === 'devnet' || savedMode === 'mock') {
      setModeState(savedMode);
    }
    const savedWallet = localStorage.getItem(MOCK_STORAGE_KEYS.ACTIVE_WALLET);
    if (savedWallet) {
      setActiveWalletState(savedWallet);
    }
  }, []);

  const setMode = (newMode: OperatingMode) => {
    setModeState(newMode);
    localStorage.setItem(MOCK_STORAGE_KEYS.MODE, newMode);
  };

  const setActiveWallet = (wallet: string) => {
    setActiveWalletState(wallet);
    localStorage.setItem(MOCK_STORAGE_KEYS.ACTIVE_WALLET, wallet);
  };

  const strategy = useMemo<TransactionStrategy>(() => {
    return mode === 'devnet' ? new DevnetTransactionStrategy() : new MockTransactionStrategy();
  }, [mode]);

  return (
    <StrategyContext.Provider value={{ mode, setMode, strategy, activeWallet, setActiveWallet }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  const context = useContext(StrategyContext);
  if (!context) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return context;
}
