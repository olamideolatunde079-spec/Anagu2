/**
 * useWallet — React hook for Web3 wallet state management.
 * Works with MetaMask, Coinbase Wallet, Trust Wallet, Brave, Rainbow etc.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  WalletState,
  connectWallet,
  disconnectWallet,
  getWalletState,
  detectWallet,
} from '../lib/web3';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false, address: null, chainId: null, balance: null, walletName: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    getWalletState().then(state => {
      if (state?.connected) setWallet(state);
    });
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handleAccounts = (accounts: string[]) => {
      if (!accounts.length) setWallet(disconnectWallet());
      else getWalletState().then(s => s && setWallet(s));
    };

    const handleChain = () => {
      getWalletState().then(s => s && setWallet(s));
    };

    eth.on('accountsChanged', handleAccounts);
    eth.on('chainChanged', handleChain);
    return () => {
      eth.removeListener('accountsChanged', handleAccounts);
      eth.removeListener('chainChanged', handleChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
    } catch (err: any) {
      setError(err.message ?? 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(disconnectWallet());
  }, []);

  const hasWallet = !!detectWallet();

  return { wallet, connecting, error, connect, disconnect, hasWallet };
}
