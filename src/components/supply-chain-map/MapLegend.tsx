import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { LOCATION_TYPE_COLORS } from '../../theme/colors';

export const MapLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Group facility types to avoid clutter
  const activeFacilityTypes = [
    { key: 'central_warehouse', ...LOCATION_TYPE_COLORS.central_warehouse, glyph: '⬢' },
    { key: 'regional_warehouse', ...LOCATION_TYPE_COLORS.regional_warehouse, glyph: '⬢' },
    { key: 'branch', ...LOCATION_TYPE_COLORS.branch, glyph: '●' },
    { key: 'supplier', ...LOCATION_TYPE_COLORS.supplier, glyph: '◆' },
    { key: 'factory', ...LOCATION_TYPE_COLORS.factory, glyph: '■' },
    { key: 'retailer', ...LOCATION_TYPE_COLORS.retailer, glyph: '▲' },
  ];

  return (
    <div className="absolute bottom-9 left-[260px] z-20 font-sans">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden transition-all duration-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Legend & Symbols</span>
          </div>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isOpen && (
          <div className="p-3.5 border-t border-slate-800 text-[11px] space-y-3.5 max-w-xs bg-slate-950/95 max-h-80 overflow-y-auto">
            {/* Facilities */}
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1.5">
                Facility Types & Shapes
              </span>
              <div className="space-y-1.5">
                {activeFacilityTypes.map((val) => (
                  <div key={val.key} className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold shrink-0 w-3 text-center"
                      style={{ color: val.color }}
                    >
                      {val.glyph}
                    </span>
                    <span className="text-slate-200">{val.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Corridors and Flow */}
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1.5">
                Logistics Corridors & Flow
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-[#55B8FF] inline-block shrink-0" />
                  <span className="text-slate-200">Bidirectional hub link</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-[#2EE6A6] inline-block shrink-0" />
                  <span className="text-slate-200">One-Way Feeder (Hub → Branch)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-xs">▲</span>
                  <span className="text-slate-400 text-[10px]">Arrow marks downstream material flow</span>
                </div>
              </div>
            </div>

            {/* Special indicators */}
            <div className="border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                Territory Flags
              </span>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 text-[9px] rounded font-mono font-bold">
                  UT
                </span>
                <span className="text-slate-300 text-[10px]">Outside state boundary</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
