import React, { useId } from 'react';

export const CadastralPattern: React.FC<{ className?: string }> = ({
  className = 'absolute inset-0 pointer-events-none overflow-hidden opacity-35',
}) => {
  const rawId = useId();
  const patternId = `cadastral-grid-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className={className} aria-hidden="true">
      <svg
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id={patternId} width="240" height="240" patternUnits="userSpaceOnUse">
            {/* Primary cadastral grid lines */}
            <rect width="240" height="240" fill="none" stroke="#E5E8E5" strokeWidth="1" />
            <line x1="120" y1="0" x2="120" y2="240" stroke="#E5E8E5" strokeWidth="0.75" />
            <line x1="0" y1="120" x2="240" y2="120" stroke="#E5E8E5" strokeWidth="0.75" />
            {/* Secondary subdivision survey lines */}
            <line x1="60" y1="0" x2="60" y2="240" stroke="#E5E8E5" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="180" y1="0" x2="180" y2="240" stroke="#E5E8E5" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="0" y1="60" x2="240" y2="60" stroke="#E5E8E5" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="0" y1="180" x2="240" y2="180" stroke="#E5E8E5" strokeWidth="0.5" strokeDasharray="4 4" />
            {/* Cadastral parcel boundary polygons */}
            <polygon points="18,18 104,24 96,102 22,94" fill="none" stroke="#E5E8E5" strokeWidth="0.9" />
            <polygon points="134,20 220,28 216,104 130,98" fill="none" stroke="#E5E8E5" strokeWidth="0.9" />
            <polygon points="20,136 102,130 108,218 26,220" fill="none" stroke="#E5E8E5" strokeWidth="0.9" />
            <polygon points="134,132 218,128 220,214 138,218" fill="none" stroke="#E5E8E5" strokeWidth="0.9" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
};
