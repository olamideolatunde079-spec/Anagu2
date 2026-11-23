import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label?: string;
  isValidator?: boolean;
}

interface Packet {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
}

export const BlockchainCadastreMesh: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate Nodes (some labeled as validator clusters or geodetic beacons)
    const nodeCount = Math.min(32, Math.floor((width * height) / 22000));
    const nodes: Node[] = [];

    const labels = [
      'Node-01 [Lagos Core]',
      'Node-02 [Survey Council]',
      'Node-03 [Cadastre Vault]',
      'Node-04 [Abuja BFT]',
      'Beacon SC/ET/091',
      'Beacon SC/ET/092',
      'Beacon SC/ET/093',
      'Beacon SC/ET/094'
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: i < 4 ? 4.5 : Math.random() * 2 + 1.5,
        label: i < labels.length ? labels[i] : undefined,
        isValidator: i < 4
      });
    }

    // Packet transmission on links
    const packets: Packet[] = [];
    const packetColors = ['#168BFF', '#6338F5', '#13C98A', '#F0B429'];

    for (let i = 0; i < 6; i++) {
      packets.push({
        fromNode: Math.floor(Math.random() * nodeCount),
        toNode: Math.floor(Math.random() * nodeCount),
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        color: packetColors[Math.floor(Math.random() * packetColors.length)]
      });
    }

    // Mouse interactive gravity
    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Subtle Cadastral Isometric Grid overlay in background
      ctx.save();
      ctx.strokeStyle = theme === 'dark' ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Mouse avoidance/attraction subtle feel
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < 140) {
          node.x -= (dx / distToMouse) * 0.6;
          node.y -= (dy / distToMouse) * 0.6;
        }

        // Connect nearby nodes with cryptographic lines
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          const maxDist = node.isValidator || other.isValidator ? 180 : 120;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (node.isValidator || other.isValidator ? 0.35 : 0.18);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle =
              node.isValidator && other.isValidator
                ? `rgba(240, 180, 41, ${alpha * 1.5})`
                : `rgba(99, 56, 245, ${alpha})`;
            ctx.lineWidth = node.isValidator && other.isValidator ? 1.5 : 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw packet transactions animating across links
      for (let p of packets) {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.fromNode = p.toNode;
          p.toNode = Math.floor(Math.random() * nodes.length);
          p.progress = 0;
        }

        const n1 = nodes[p.fromNode];
        const n2 = nodes[p.toNode];
        if (n1 && n2) {
          const px = n1.x + (n2.x - n1.x) * p.progress;
          const py = n1.y + (n2.y - n1.y) * p.progress;

          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isValidator) {
          ctx.fillStyle = '#F0B429';
          ctx.shadowColor = '#F0B429';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Pulse ring around validator
          ctx.beginPath();
          const pulseR = node.radius + 4 + Math.sin(time * 3 + i) * 3;
          ctx.arc(node.x, node.y, Math.max(1, pulseR), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(240, 180, 41, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#168BFF';
          ctx.fill();
        }

        // Labels for designated nodes
        if (node.label && width > 640) {
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = node.isValidator ? 'rgba(240, 180, 41, 0.8)' : 'rgba(148, 163, 184, 0.6)';
          ctx.fillText(node.label, node.x + 8, node.y + 3);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-35"
    />
  );
};
