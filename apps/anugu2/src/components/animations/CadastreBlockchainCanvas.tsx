import React, { useEffect, useRef } from 'react';

interface ParcelPolygon {
  points: { x: number; y: number }[];
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  angle: number;
  va: number;
  color: string;
  label: string;
  areaText: string;
  size: number;
  pulsePhase: number;
}

interface NFTTokenPrism {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  tokenId: string;
  grantee: string;
  glowColor: string;
}

interface BlockchainBlockNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  blockNumber: number;
  hash: string;
  txCount: number;
}

export const CadastreBlockchainCanvas: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const isDark = theme === 'dark';
    const isMobile = width < 768;

    // 1. Cadastral Land Parcel Polygons
    const parcels: ParcelPolygon[] = [];
    const parcelLabels = [
      { code: 'PARCEL C-OF-O #8849', area: '1,250 m²' },
      { code: 'PLOT 481 [RESIDENTIAL]', area: '850 m²' },
      { code: 'CADASTRE ZONE 31N', area: '2,400 m²' },
      { code: 'TITLED ESTATE #0912', area: '3.5 Ha' },
      { code: 'SURVEY TRAVERSE #1104', area: '1,800 m²' },
      { code: 'COMMERCIAL CORRIDOR 60m', area: '5,000 m²' }
    ];
    const parcelColors = isDark
      ? ['#6338F5', '#168BFF', '#13C98A', '#F0B429', '#EC4899']
      : ['#4F46E5', '#0284C7', '#059669', '#D97706', '#DB2777'];

    const parcelCount = isMobile ? 4 : 7;
    for (let i = 0; i < parcelCount; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const size = Math.random() * (isMobile ? 30 : 50) + (isMobile ? 50 : 75);
      const sides = Math.floor(Math.random() * 2) + 4; // 4 or 5-sided polygon
      const points: { x: number; y: number }[] = [];

      for (let s = 0; s < sides; s++) {
        const rad = (s / sides) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        const r = size * (0.8 + Math.random() * 0.4);
        points.push({
          x: Math.cos(rad) * r,
          y: Math.sin(rad) * r
        });
      }

      const info = parcelLabels[i % parcelLabels.length];
      parcels.push({
        points,
        cx,
        cy,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.002,
        color: parcelColors[i % parcelColors.length],
        label: info.code,
        areaText: info.area,
        size,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // 2. Holographic NFT Title Prisms (NFT)
    const nftPrisms: NFTTokenPrism[] = [];
    const tokenInfo = [
      { id: 'NFT-C-OF-O #4912', owner: 'E. Adeleke' },
      { id: 'ERC-721 #0091', owner: 'B. Ibrahim' },
      { id: 'TITLE DEED #1192', owner: 'K. Okonkwo' },
      { id: 'NFT ESTATE #7731', owner: 'F. Williams' }
    ];
    const nftCount = isMobile ? 3 : 5;
    for (let i = 0; i < nftCount; i++) {
      const item = tokenInfo[i % tokenInfo.length];
      nftPrisms.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        size: Math.random() * 8 + (isMobile ? 16 : 22),
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
        tokenId: item.id,
        grantee: item.owner,
        glowColor: isDark ? '#F0B429' : '#D97706'
      });
    }

    // 3. Blockchain Blocks & Consensus Nodes (Blockchain)
    const blocks: BlockchainBlockNode[] = [];
    const blockCount = isMobile ? 5 : 9;
    for (let i = 0; i < blockCount; i++) {
      blocks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        blockNumber: 1861000 + i,
        hash: '0x' + Math.floor(Math.random() * 0xffffff).toString(16),
        txCount: Math.floor(Math.random() * 12) + 1
      });
    }

    // Cursor / Touch Tracking for interactive ripples
    const pointer = { x: -2000, y: -2000, active: false };
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      pointer.active = true;
      if ('touches' in e && e.touches.length > 0) {
        pointer.x = e.touches[0].clientX;
        pointer.y = e.touches[0].clientY;
      } else if ('clientX' in e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }
    };
    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.x = -2000;
      pointer.y = -2000;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('touchend', handlePointerLeave);

    let time = 0;

    const render = () => {
      time += 0.012;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // --- Subtle Geodetic Grid with Radar Crosshairs & Lat/Lng Coordinates ---
      const gridSpacing = isMobile ? 90 : 110;
      ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(79, 70, 229, 0.06)';
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Elevation coordinate tick marks
      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(71, 85, 105, 0.35)';
      ctx.font = '8px monospace';
      for (let x = gridSpacing; x < width; x += gridSpacing * 2.5) {
        for (let y = gridSpacing; y < height; y += gridSpacing * 2.5) {
          ctx.fillText(`+ [6.${Math.floor((x * 3) % 900)}°N, 3.${Math.floor((y * 3) % 900)}°E]`, x + 4, y - 4);
        }
      }

      // Pointer interactive geodetic radar beacon circle
      if (pointer.active && pointer.x > 0 && pointer.y > 0) {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 45 + Math.sin(time * 3) * 6, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#13C98A' : '#059669';
        ctx.fill();
      }

      // --- 1. Cadastral Land Parcel Boundaries (Land) ---
      for (const p of parcels) {
        p.cx += p.vx;
        p.cy += p.vy;
        p.angle += p.va;
        p.pulsePhase += 0.025;

        if (p.cx < -120) p.cx = width + 120;
        if (p.cx > width + 120) p.cx = -120;
        if (p.cy < -120) p.cy = height + 120;
        if (p.cy > height + 120) p.cy = -120;

        ctx.save();
        ctx.translate(p.cx, p.cy);
        ctx.rotate(p.angle);

        // Polygon perimeter
        ctx.beginPath();
        for (let i = 0; i < p.points.length; i++) {
          const pt = p.points[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();

        // Translucent parcel fill
        ctx.fillStyle = p.color;
        ctx.globalAlpha = isDark ? 0.045 : 0.055;
        ctx.fill();

        // Parcel perimeter boundary line
        ctx.globalAlpha = isDark ? 0.35 : 0.35;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Draw boundary concrete beacon corner pillars with radar rings
        for (let i = 0; i < p.points.length; i++) {
          const pt = p.points[i];
          ctx.globalAlpha = isDark ? 0.8 : 0.8;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? '#F0B429' : '#D97706';
          ctx.fill();

          // Pulsing radar GPS ring
          const pulseR = 5 + Math.sin(p.pulsePhase + i) * 3.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, pulseR), 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(240, 180, 41, 0.6)' : 'rgba(217, 119, 6, 0.55)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        // Center cadastral code & area labels
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.65)';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, 0, 0);
        ctx.font = '8px monospace';
        ctx.fillStyle = isDark ? 'rgba(19, 201, 138, 0.7)' : 'rgba(5, 150, 105, 0.8)';
        ctx.fillText(`AREA: ${p.areaText}`, 0, 12);

        ctx.restore();
      }

      // --- 2. Blockchain Consensus Nodes & Connected Mesh (Blockchain) ---
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < 10 || b.x > width - 10) b.vx *= -1;
        if (b.y < 10 || b.y > height - 10) b.vy *= -1;

        // Connect nearby blocks with consensus links
        for (let j = i + 1; j < blocks.length; j++) {
          const b2 = blocks[j];
          const dist = Math.hypot(b.x - b2.x, b.y - b2.y);
          const maxDist = isMobile ? 180 : 260;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isDark ? 0.28 : 0.22);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.strokeStyle = isDark ? `rgba(99, 56, 245, ${alpha})` : `rgba(79, 70, 229, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Animated transaction data packets shooting between blocks
            const packetT = (time * 0.7 + i * 0.3 + j * 0.2) % 1;
            const px = b.x + (b2.x - b.x) * packetT;
            const py = b.y + (b2.y - b.y) * packetT;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? '#168BFF' : '#0284C7';
            ctx.fill();
          }
        }

        // Draw Block Node (isometric cube representation)
        ctx.save();
        ctx.translate(b.x, b.y);

        // Cube face
        ctx.strokeStyle = isDark ? 'rgba(22, 139, 255, 0.6)' : 'rgba(2, 132, 199, 0.6)';
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-13, -13, 26, 26);
        ctx.fillRect(-13, -13, 26, 26);

        // Small 3D top slant line
        ctx.beginPath();
        ctx.moveTo(-13, -13);
        ctx.lineTo(-7, -19);
        ctx.lineTo(19, -19);
        ctx.lineTo(13, -13);
        ctx.stroke();

        ctx.font = '8px monospace';
        ctx.fillStyle = isDark ? '#13C98A' : '#059669';
        ctx.textAlign = 'center';
        ctx.fillText(`#${b.blockNumber}`, 0, 3);
        ctx.restore();
      }

      // --- 3. Holographic 3D NFT Title Deed Prisms (NFT) ---
      for (const nft of nftPrisms) {
        nft.x += nft.vx;
        nft.y += nft.vy;
        nft.rot += nft.vRot;

        if (nft.x < 20 || nft.x > width - 20) nft.vx *= -1;
        if (nft.y < 20 || nft.y > height - 20) nft.vy *= -1;

        ctx.save();
        ctx.translate(nft.x, nft.y);
        ctx.rotate(nft.rot);

        // Draw 3D Octahedron / Diamond facet geometry
        ctx.beginPath();
        ctx.moveTo(0, -nft.size);
        ctx.lineTo(nft.size * 0.85, 0);
        ctx.lineTo(0, nft.size);
        ctx.lineTo(-nft.size * 0.85, 0);
        ctx.closePath();

        // Shimmer gradient fill
        ctx.fillStyle = isDark ? 'rgba(240, 180, 41, 0.08)' : 'rgba(217, 119, 6, 0.08)';
        ctx.fill();

        ctx.strokeStyle = nft.glowColor;
        ctx.globalAlpha = isDark ? 0.65 : 0.6;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Internal facet structure
        ctx.beginPath();
        ctx.moveTo(0, -nft.size);
        ctx.lineTo(0, nft.size);
        ctx.moveTo(-nft.size * 0.85, 0);
        ctx.lineTo(nft.size * 0.85, 0);
        ctx.strokeStyle = isDark ? 'rgba(99, 56, 245, 0.5)' : 'rgba(79, 70, 229, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center gleaming gem pip
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        ctx.restore();

        // NFT Title Badge & Deed Metadata
        ctx.save();
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = isDark ? 'rgba(240, 180, 41, 0.85)' : 'rgba(180, 83, 9, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(nft.tokenId, nft.x, nft.y + nft.size + 13);
        ctx.font = '8px monospace';
        ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.65)' : 'rgba(100, 116, 139, 0.8)';
        ctx.fillText(`Grantee: ${nft.grantee}`, nft.x, nft.y + nft.size + 23);
        ctx.restore();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchend', handlePointerLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-300"
      style={{
        opacity: 0.08
      }}
      aria-hidden="true"
    />
  );
};
