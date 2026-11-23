"use client";
/**
 * TxHashDisplay — truncated blockchain transaction hash with copy button.
 */
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

interface TxHashDisplayProps {
  hash:        string;
  explorerUrl?: string;
  className?:  string;
  truncate?:   number; // chars to show at start and end
}

export function TxHashDisplay({
  hash,
  explorerUrl,
  className,
  truncate = 8,
}: TxHashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const display =
    hash.length > truncate * 2 + 3
      ? `${hash.slice(0, truncate)}…${hash.slice(-truncate)}`
      : hash;

  const copy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <code className="font-mono text-xs text-[#168BFF] bg-[#168BFF]/10 px-2 py-0.5 rounded">
        {display}
      </code>
      <button
        type="button"
        onClick={copy}
        className="text-[#AAB4CC] hover:text-white transition-colors"
        aria-label="Copy transaction hash"
      >
        {copied ? <Check size={13} className="text-[#13C98A]" /> : <Copy size={13} />}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#AAB4CC] hover:text-[#168BFF] transition-colors"
          aria-label="Open in block explorer"
        >
          <ExternalLink size={13} />
        </a>
      )}
    </span>
  );
}
