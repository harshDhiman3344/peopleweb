import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { RELATIONSHIP_COLORS, RELATIONSHIP_LABELS, type RelationshipType } from '../../types/graph';

export const Legend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const types = Object.keys(RELATIONSHIP_COLORS) as RelationshipType[];

  return (
    <div className="bg-[#0f172a]/85 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-xl shadow-black/40 text-xs text-slate-300 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 gap-2 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>Graph Legend</span>
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-700/60 max-w-[240px] space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Relationship Types
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {types.slice(0, 7).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 shrink-0"
                  style={{ backgroundColor: RELATIONSHIP_COLORS[type] }}
                />
                <span className="truncate">{RELATIONSHIP_LABELS[type]}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p>• Click node to open details</p>
            <p>• Drag node to reposition</p>
            <p>• Hover to isolate neighborhood</p>
          </div>
        </div>
      )}
    </div>
  );
};
