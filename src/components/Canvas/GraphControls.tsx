import React, { useState } from 'react';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import {
  Focus,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  RefreshCw,
  Unlock,
  Compass,
} from 'lucide-react';

interface GraphControlsProps {
  graphRef: React.MutableRefObject<ForceGraphMethods | undefined>;
  onUnpinAll?: () => void;
}

export const GraphControls: React.FC<GraphControlsProps> = ({ graphRef, onUnpinAll }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => {
    const fg = graphRef.current;
    if (fg) {
      const zoom = fg.zoom();
      fg.zoom(zoom * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    const fg = graphRef.current;
    if (fg) {
      const zoom = fg.zoom();
      fg.zoom(zoom * 0.75, 300);
    }
  };

  const handleFit = () => {
    const fg = graphRef.current;
    if (fg) {
      fg.zoomToFit(500, 60);
    }
  };

  const handleCenter = () => {
    const fg = graphRef.current;
    if (fg) {
      fg.centerAt(0, 0, 400);
    }
  };

  const handleReheat = () => {
    const fg = graphRef.current;
    if (fg) {
      fg.d3ReheatSimulation();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-1.5 bg-[#0f172a]/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl shadow-black/40 text-slate-300">
      <button
        onClick={handleFit}
        title="Fit entire graph to screen"
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        <Focus className="w-4 h-4" />
      </button>

      <button
        onClick={handleZoomIn}
        title="Zoom In"
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>

      <button
        onClick={handleZoomOut}
        title="Zoom Out"
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>

      <button
        onClick={handleCenter}
        title="Center origin"
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        <Compass className="w-4 h-4" />
      </button>

      <div className="h-px bg-slate-700/60 my-0.5" />

      <button
        onClick={handleReheat}
        title="Reheat bouncy physics simulation"
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {onUnpinAll && (
        <button
          onClick={onUnpinAll}
          title="Release pinned nodes"
          className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
        >
          <Unlock className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        className="p-2 hover:bg-slate-700/60 hover:text-white rounded-lg transition-colors"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );
};
