import React from 'react';
import {
  RotateCcw,
  Layers,
  Box,
  Activity,
  Hand,
  Orbit,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';
import type { LayerVisibility, InteractionMode } from '../../types/map';

interface MapControlsProps {
  onResetView: () => void;
  layerVisibility: LayerVisibility;
  onToggleLayer: <K extends keyof LayerVisibility>(layer: K) => void;
  interactionMode: InteractionMode;
  onToggleInteractionMode: (mode: InteractionMode) => void;
  onPanDirection: (dx: number, dz: number) => void;
  onZoom: (factor: number) => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onResetView,
  layerVisibility,
  onToggleLayer,
  interactionMode,
  onToggleInteractionMode,
  onPanDirection,
  onZoom,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-3 pointer-events-none">
      {/* 1. MOUSE INTERACTION MODE TOGGLE (PAN vs 3D ROTATE) */}
      <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/70 shadow-2xl flex items-center gap-1 pointer-events-auto">
        <button
          onClick={() => onToggleInteractionMode('pan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            interactionMode === 'pan'
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(46,230,166,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Pan / Move Mode: Left-Click and Drag to move map across screen"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Move Map</span>
        </button>

        <button
          onClick={() => onToggleInteractionMode('rotate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            interactionMode === 'rotate'
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(46,230,166,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="3D Orbit Mode: Left-Click and Drag to rotate in 3D"
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>3D Rotate</span>
        </button>
      </div>

      {/* 2. D-PAD DIRECTIONAL NAVIGATION & ZOOM */}
      <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700/70 shadow-2xl flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* D-Pad cluster */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-24 h-24 items-center justify-items-center">
          {/* Top / North */}
          <button
            onClick={() => onPanDirection(0, -3)}
            className="col-start-2 row-start-1 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
            title="Move North (Up)"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Left / West */}
          <button
            onClick={() => onPanDirection(-3, 0)}
            className="col-start-1 row-start-2 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
            title="Move West (Left)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Center / Reset */}
          <button
            onClick={onResetView}
            className="col-start-2 row-start-2 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
            title="Center Map"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Right / East */}
          <button
            onClick={() => onPanDirection(3, 0)}
            className="col-start-3 row-start-2 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
            title="Move East (Right)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Bottom / South */}
          <button
            onClick={() => onPanDirection(0, 3)}
            className="col-start-2 row-start-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
            title="Move South (Down)"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-full h-px bg-slate-800 my-0.5" />

        {/* Zoom In & Out */}
        <div className="flex items-center gap-1.5 w-full justify-between">
          <button
            onClick={() => onZoom(0.8)}
            className="flex-1 py-1 px-2 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-bold transition-colors"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoom(1.25)}
            className="flex-1 py-1 px-2 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-bold transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. QUICK 3D TOGGLES */}
      <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-2xl flex flex-col gap-1 text-slate-300 pointer-events-auto">
        {/* 3D Extrusion Toggle */}
        <button
          onClick={() => onToggleLayer('extruded3D')}
          className={`p-2 rounded-lg transition-colors group relative ${
            layerVisibility.extruded3D
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'hover:bg-slate-800 hover:text-white text-slate-400'
          }`}
          title="Toggle 3D Surface Extrusion"
        >
          <Box className="w-4 h-4" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            3D Elevation: {layerVisibility.extruded3D ? 'Raised' : 'Flat'}
          </span>
        </button>

        {/* Route Particles Animation Toggle */}
        <button
          onClick={() => onToggleLayer('routeParticles')}
          className={`p-2 rounded-lg transition-colors group relative ${
            layerVisibility.routeParticles
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'hover:bg-slate-800 hover:text-white text-slate-400'
          }`}
          title="Toggle Flow Particles"
        >
          <Activity className="w-4 h-4" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Flow Particles: {layerVisibility.routeParticles ? 'Active' : 'Paused'}
          </span>
        </button>

        {/* District Boundaries Toggle */}
        <button
          onClick={() => onToggleLayer('districtBoundaries')}
          className={`p-2 rounded-lg transition-colors group relative ${
            layerVisibility.districtBoundaries
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'hover:bg-slate-800 hover:text-white text-slate-400'
          }`}
          title="Toggle District Boundaries"
        >
          <Layers className="w-4 h-4" />
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            District Boundaries
          </span>
        </button>
      </div>

      {/* 4. INTERACTION HINT BADGE */}
      <div className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/50 text-[10px] text-slate-400 font-mono pointer-events-auto">
        {interactionMode === 'pan' ? (
          <span>🖐️ Left-Drag: Pan • Right-Drag: Tilt</span>
        ) : (
          <span>🔄 Left-Drag: Tilt • Right-Drag: Pan</span>
        )}
      </div>
    </div>
  );
};
