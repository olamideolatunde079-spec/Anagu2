import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  Lock,
  Zap,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

export const HolographicNFTDeedCard: React.FC = () => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [mintStage, setMintStage] = useState<'idle' | 'scanning' | 'hashing' | 'consensus' | 'minted'>('idle');
  const [hashText, setHashText] = useState('0x8f2a41d99b031ce7b99c89e4726b12a873e4912a');
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse tilt tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50 });
  };

  // Trigger blockchain minting simulation
  const handleTriggerMint = () => {
    if (mintStage !== 'idle' && mintStage !== 'minted') return;

    setMintStage('scanning');

    setTimeout(() => {
      setMintStage('hashing');
    }, 1200);

    setTimeout(() => {
      setMintStage('consensus');
    }, 2400);

    setTimeout(() => {
      setMintStage('minted');
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 3600);
  };

  useEffect(() => {
    if (mintStage === 'hashing') {
      const interval = setInterval(() => {
        const hex = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setHashText(hex);
      }, 70);
      return () => clearInterval(interval);
    } else if (mintStage === 'minted') {
      setHashText('0x9a8f4b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a');
    }
  }, [mintStage]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none perspective-[1000px] w-full max-w-md mx-auto">
      {/* 3D Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full relative transition-transform duration-200 ease-out cursor-pointer"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* FRONT OF CARD */}
        <div
          className={`relative rounded-2xl border-2 border-[#245C43]/20 bg-white p-6 shadow-md overflow-hidden transition-all duration-300 ${
            isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Top Ribbon */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5] relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#245C43] flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-[#245C43] font-bold tracking-widest block">
                  ANAGU SOVEREIGN TITLE DEED
                </span>
                <span className="text-xs font-bold text-[#252B28] font-mono">
                  C-OF-O-2026-004912
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-800 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
              <span>ERC-721-CADASTRE</span>
            </div>
          </div>

          {/* Cadastral Polygon Map Preview */}
          <div className="my-4 relative h-48 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 300 200" className="w-full h-full relative z-10 p-2">
              <defs>
                <linearGradient id="plotGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#245C43" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#245C43" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="100" x2="280" y2="100" stroke="#E5E8E5" strokeDasharray="4 4" />
              <line x1="150" y1="20" x2="150" y2="180" stroke="#E5E8E5" strokeDasharray="4 4" />

              {/* Cadastral Polygon */}
              <polygon
                points="70,40 220,55 190,165 50,140"
                fill="url(#plotGradientLight)"
                stroke="#245C43"
                strokeWidth="2.5"
                className="transition-all duration-300"
              />

              {/* Beacons */}
              {[
                { x: 70, y: 40, label: 'BC-01 (6.4382°N)' },
                { x: 220, y: 55, label: 'BC-02 (6.4389°N)' },
                { x: 190, y: 165, label: 'BC-03 (6.4384°N)' },
                { x: 50, y: 140, label: 'BC-04 (6.4377°N)' }
              ].map((b, idx) => (
                <g key={idx}>
                  <circle cx={b.x} cy={b.y} r="5" fill="#245C43" stroke="#FFFFFF" strokeWidth="2" />
                  <text x={b.x + 8} y={b.y + 3} fill="#4A524D" fontSize="8" fontFamily="monospace" fontWeight="600">
                    {b.label}
                  </text>
                </g>
              ))}

              {/* Center Stamp */}
              <text x="105" y="110" fill="#252B28" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                1,250 m²
              </text>
              <text x="108" y="124" fill="#245C43" fontSize="9" fontFamily="monospace" fontWeight="600">
                TOPOLOGY VALID
              </text>
            </svg>
          </div>

          {/* Token Metadata Breakdown */}
          <div className="space-y-2 text-xs relative z-10">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#4A524D]">Owner (NIN Linked):</span>
              <span className="text-[#252B28] font-bold">Chief Emeka Adeleke</span>
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#4A524D]">Jurisdiction:</span>
              <span className="text-[#245C43] font-semibold">Lekki Phase 1, Lagos State</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-1 font-mono text-[11px]">
              <div className="text-[#4A524D] flex items-center justify-between">
                <span>Cryptographic Digest:</span>
                <span className="text-[#252B28] font-bold">Block #1861005</span>
              </div>
              <div className="text-[#245C43] truncate font-semibold">{hashText}</div>
            </div>
          </div>

          {/* Minting Status Alert */}
          {mintStage !== 'idle' && (
            <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-center relative z-10">
              {mintStage === 'scanning' && <span className="text-[#252B28]">📡 Scanning 4 WGS-84 Beacons...</span>}
              {mintStage === 'hashing' && <span className="text-[#245C43]">⚡ Generating SHA-256 Merkle Root...</span>}
              {mintStage === 'consensus' && <span className="text-[#245C43]">🛡️ 4/4 BFT Nodes Signing Assent...</span>}
              {mintStage === 'minted' && (
                <span className="text-emerald-800 font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>TOKEN COMMITTED TO CONSENSUS LEDGER!</span>
                </span>
              )}
            </div>
          )}

          {/* Action Strip: Mint Simulation & 3D Flip */}
          <div className="mt-4 pt-3 border-t border-[#E5E8E5] flex items-center justify-between gap-2 relative z-10">
            <button
              onClick={handleTriggerMint}
              disabled={mintStage !== 'idle' && mintStage !== 'minted'}
              className="flex-1 py-2 px-3 rounded-lg bg-[#245C43] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1B4733] transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{mintStage === 'minted' ? 'Mint Again' : 'Simulate Minting'}</span>
            </button>

            <button
              onClick={() => setIsFlipped(true)}
              className="p-2 rounded-lg bg-[#F7F8F7] hover:bg-[#E5E8E5] text-[#252B28] transition-colors border border-[#CBD0C8]"
              title="Flip to inspect Smart Contract bytecode"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BACK OF CARD (Flipped State) */}
        <div
          className={`absolute inset-0 rounded-2xl border-2 border-[#245C43]/20 bg-white p-6 shadow-md overflow-hidden transition-all duration-300 ${
            !isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <span className="text-xs font-bold text-[#252B28] font-mono flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#245C43]" />
              Smart Contract Bytecode & Invariants
            </span>
            <button
              onClick={() => setIsFlipped(false)}
              className="p-1.5 rounded-lg bg-[#F7F8F7] text-[#252B28] hover:bg-[#E5E8E5] text-xs font-semibold border border-[#CBD0C8]"
            >
              Flip Back
            </button>
          </div>

          <div className="space-y-3 mt-4 text-xs font-mono">
            <div className="p-3 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] space-y-1">
              <div className="text-[10px] text-[#4A524D]">EVM Token Address</div>
              <div className="text-[#245C43] text-xs font-bold truncate">
                0x71C6372985B8e949182a41d99b031ce7b99c89e4
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] space-y-1">
              <div className="text-[10px] text-[#4A524D]">Decentralized IPFS CID</div>
              <div className="text-[#252B28] text-xs font-bold truncate">
                QmZtmD2qt8S991eZg9z48v9324hfkz924jfe949
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] space-y-1">
              <div className="text-[10px] text-[#4A524D]">Solidity Restriction Invariant</div>
              <div className="text-emerald-800 text-[11px] font-medium leading-relaxed">
                require(registryApproved[from][to], "Direct P2P conveyances prohibited by Land Use Act");
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#4A524D] pt-2">
              <span>Standard: ERC-721-CADASTRE</span>
              <span className="text-[#245C43] font-bold">State Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
