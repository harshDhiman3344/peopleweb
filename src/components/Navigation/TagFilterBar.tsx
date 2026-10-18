import React from 'react';
import { Tag, X } from 'lucide-react';

interface TagFilterBarProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}) => {
  if (allTags.length === 0) return null;

  return (
    <div className="fixed top-18 inset-x-4 sm:inset-x-6 z-20 flex items-center gap-1.5 overflow-x-auto py-1 pointer-events-none scrollbar-none">
      <div className="flex items-center gap-1.5 p-1 bg-[#0d1322]/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-lg pointer-events-auto">
        <span className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          <Tag className="w-3 h-3 text-sky-400" />
          <span>Circles:</span>
        </span>

        {selectedTags.length > 0 && (
          <button
            onClick={onClearTags}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors shrink-0"
          >
            <span>Clear</span>
            <X className="w-3 h-3" />
          </button>
        )}

        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-lg transition-all shrink-0 border ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:border-slate-500 hover:text-white'
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};
