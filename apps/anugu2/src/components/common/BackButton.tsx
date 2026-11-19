import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = 'Back',
  className = '',
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/portal/dashboard');
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-semibold transition-colors shadow-xs group bg-white text-[#252B28] border border-[#CBD0C8] hover:border-[#245C43] hover:text-[#245C43] hover:bg-[#F7F8F7] ${className}`}
      title="Navigate back"
      aria-label="Back button"
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[#245C43]" />
      <span>{label}</span>
    </button>
  );
};
