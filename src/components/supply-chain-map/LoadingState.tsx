import React from 'react';
import { Loader2, Globe, AlertTriangle } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading Geographic Boundary Data & Initializing 3D Engine...',
}) => {
  return (
    <div className="absolute inset-0 bg-[#07111F] flex flex-col items-center justify-center z-50 p-6 select-none">
      <div className="relative mb-6">
        {/* Pulsing radar rings */}
        <div className="w-20 h-20 rounded-full border border-emerald-500/30 animate-ping absolute inset-0" />
        <div className="w-20 h-20 rounded-full border border-sky-500/20 animate-pulse absolute inset-0" />
        <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative shadow-2xl">
          <Globe className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      <div className="text-center max-w-sm">
        <h3 className="text-base font-semibold text-white tracking-tight mb-1">
          Tamil Nadu Geospatial Network
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          {message}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        <span>Supply Chain Control Tower</span>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="absolute inset-0 bg-[#07111F] flex flex-col items-center justify-center z-50 p-6 text-center select-none">
      <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-xl">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Visualization Engine Error</h3>
      <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono text-red-300">
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg"
        >
          Retry Initialization
        </button>
      )}
    </div>
  );
};
