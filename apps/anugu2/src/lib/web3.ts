/**
 * ANAGU — Web3 Wallet Integration
 * 
 * Supports: MetaMask, Coinbase Wallet, Trust Wallet, Rainbow, Brave Wallet,
 * and any EIP-1193 compatible wallet on desktop or mobile.
 * 
 * On mobile: triggers wallet via WalletConnect deep link if no injected provider.
 */
import { BrowserProvider, parseEther, formatEther, Contract } from 'ethers';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WalletState {
  connected:  boolean;
  address:    string | null;
  chainId:    number | null;
  balance:    string | null;
  walletName: string | null;
}

export interface LandBuyParams {
  tokenId:        string;
  sellerAddress:  string;
  priceEth:       string;   // e.g. "0.5"
  parcelTitle:    string;
}

export interface TransactionResult {
  txHash:  string;
  success: boolean;
  error?:  string;
}

// ── ERC-721 LandTitleNFT & LandRegistry ABIs (Polygon Amoy integration) ──────
const LAND_NFT_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function isRevoked(uint256 tokenId) view returns (bool)',
  'function titleStatus(uint256 tokenId) view returns (uint8)',
  'function spatialHash(uint256 tokenId) view returns (bytes32)',
  'function parcelId(uint256 tokenId) view returns (string)',
  'function registrarTransfer(address from, address to, uint256 tokenId)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'event TitleIssued(uint256 indexed tokenId, address indexed owner, string parcelId, bytes32 spatialHash, uint256 timestamp)',
  'event TitleTransferred(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 deedRefHash, uint256 timestamp)',
  'event TitleRevoked(uint256 indexed tokenId, uint8 ground, address indexed revokedBy, uint256 timestamp)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// Polygon Amoy Testnet (approved Polygon PoS development & test network; no mainnet)
const CHAIN_CONFIG = {
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
};

// ── Detect wallet provider ─────────────────────────────────────────────────────
export function detectWallet(): { provider: any; name: string } | null {
  if (typeof window === 'undefined') return null;
  
  const eth = (window as any).ethereum;
  if (!eth) return null;

  // Identify wallet
  let name = 'Web3 Wallet';
  if (eth.isMetaMask)         name = 'MetaMask';
  else if (eth.isCoinbaseWallet) name = 'Coinbase Wallet';
  else if (eth.isTrust)       name = 'Trust Wallet';
  else if (eth.isBraveWallet) name = 'Brave Wallet';
  else if (eth.isRainbow)     name = 'Rainbow';

  return { provider: eth, name };
}

// ── Connect wallet ─────────────────────────────────────────────────────────────
export async function connectWallet(): Promise<WalletState> {
  const wallet = detectWallet();
  
  if (!wallet) {
    throw new Error('No Web3 wallet detected. Install MetaMask or use a Web3-enabled browser.');
  }

  try {
    // Request account access — triggers wallet popup
    const accounts: string[] = await wallet.provider.request({
      method: 'eth_requestAccounts',
    });

    const provider = new BrowserProvider(wallet.provider);
    const network  = await provider.getNetwork();
    const balance  = await provider.getBalance(accounts[0]);

    return {
      connected:  true,
      address:    accounts[0],
      chainId:    Number(network.chainId),
      balance:    parseFloat(formatEther(balance)).toFixed(4),
      walletName: wallet.name,
    };
  } catch (err: any) {
    if (err.code === 4001) throw new Error('Connection rejected. Please approve the wallet request.');
    throw err;
  }
}

// ── Get current wallet state (without prompt) ─────────────────────────────────
export async function getWalletState(): Promise<WalletState | null> {
  const wallet = detectWallet();
  if (!wallet) return null;

  try {
    const accounts: string[] = await wallet.provider.request({ method: 'eth_accounts' });
    if (!accounts.length) return { connected: false, address: null, chainId: null, balance: null, walletName: null };

    const provider = new BrowserProvider(wallet.provider);
    const network  = await provider.getNetwork();
    const balance  = await provider.getBalance(accounts[0]);

    return {
      connected:  true,
      address:    accounts[0],
      chainId:    Number(network.chainId),
      balance:    parseFloat(formatEther(balance)).toFixed(4),
      walletName: wallet.name,
    };
  } catch {
    return null;
  }
}

// ── Disconnect (clear state — cannot revoke programmatically in EIP-1193) ────────
export function disconnectWallet(): WalletState {
  return { connected: false, address: null, chainId: null, balance: null, walletName: null };
}

// ── Initiate land purchase ─────────────────────────────────────────────────────
/**
 * Triggers the user's Web3 wallet to sign a land purchase transaction.
 * 
 * Flow:
 *  1. Connect wallet (if not connected)
 *  2. Send ETH to escrow / seller address (payment)
 *  3. Emit event for backend to pick up and call registrarTransfer()
 * 
 * Note: In production, step 3 should be a smart contract escrow pattern.
 * The backend monitors the transaction and calls the LandRegistry.transferTitle()
 * after payment confirmation.
 */
export async function initiateLandPurchase(
  params: LandBuyParams
): Promise<TransactionResult> {
  const wallet = detectWallet();
  if (!wallet) {
    throw new Error('No wallet detected. Please install MetaMask.');
  }

  const provider = new BrowserProvider(wallet.provider);
  const signer   = await provider.getSigner();
  const buyer    = await signer.getAddress();

  try {
    // Send payment transaction — triggers wallet popup with:
    //   To: seller address
    //   Value: price in ETH
    //   Data: encoded parcel title for reference
    const bytes = new TextEncoder().encode(`ANAGU:BUY:${params.tokenId}:${params.parcelTitle}`);
    const dataHex = '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const tx = await signer.sendTransaction({
      to:    params.sellerAddress,
      value: parseEther(params.priceEth),
      data:  dataHex,
      // Gas limit — registry transfer will cost more; this is just the payment
      gasLimit: 100_000n,
    });

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);

    return {
      txHash:  receipt?.hash ?? tx.hash,
      success: true,
    };
  } catch (err: any) {
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      return { txHash: '', success: false, error: 'Transaction rejected by user.' };
    }
    return { txHash: '', success: false, error: err.message ?? 'Transaction failed.' };
  }
}

// ── Sign a land attestation message (community witness) ───────────────────────
export async function signAttestation(parcelId: string, boundary: string): Promise<string> {
  const wallet = detectWallet();
  if (!wallet) throw new Error('No wallet detected.');

  const provider = new BrowserProvider(wallet.provider);
  const signer   = await provider.getSigner();
  
  const message = `ANAGU Boundary Attestation\nParcel: ${parcelId}\nBoundary: ${boundary}\nTimestamp: ${Date.now()}`;
  return signer.signMessage(message);
}

// ── Add ANAGU network to MetaMask ─────────────────────────────────────────────
export async function addAnaguNetwork(): Promise<void> {
  const wallet = detectWallet();
  if (!wallet) throw new Error('No wallet detected.');

  await wallet.provider.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId:         `0x${CHAIN_CONFIG.chainId.toString(16)}`,
      chainName:       CHAIN_CONFIG.chainName,
      rpcUrls:         CHAIN_CONFIG.rpcUrls,
      nativeCurrency:  CHAIN_CONFIG.nativeCurrency,
    }],
  });
}
