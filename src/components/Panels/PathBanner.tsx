import React from 'react';
import { Sparkles, X, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { RELATIONSHIP_LABELS, type PathResult } from '../../types/graph';

interface PathBannerProps {
  pathResult: PathResult | null;
  onClear: () => void;
  onSelectPerson: (id: string) => void;
  onFocusPath: () => void;
}

export const PathBanner: React.FC<PathBannerProps> = ({
  pathResult,
  onClear,
  onSelectPerson,
  onFocusPath,
}) => {
  if (!pathResult) return null;

  if (!pathResult.found) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[92%] sm:w-auto bg-[#0f172a]/95 backdrop-blur-md border border-rose-500/40 rounded-2xl shadow-2xl shadow-black/80 p-4 text-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-semibold text-rose-300">No Connection Found</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {pathResult.explanation ||
                'No path exists between these two people in the current network.'}
            </p>
          </div>
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[94%] bg-[#0d1322]/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/10 p-4 text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="text-sm font-bold text-amber-300">
            {pathResult.degrees === 0
              ? 'Same Individual (0 Degrees)'
              : pathResult.degrees === 1
              ? 'Direct Connection (1st Degree)'
              : `${pathResult.degrees} Degrees of Separation`}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            ({pathResult.nodes.length} people, {pathResult.links.length} relationships)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onFocusPath}
            title="Center view on path"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>
          <button
            onClick={onClear}
            title="Dismiss path"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Narrative explanation */}
      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
        {pathResult.explanation}
      </p>

      {/* Chain breadcrumbs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
        {pathResult.nodes.map((node, idx) => {
          const step = pathResult.steps[idx];
          return (
            <React.Fragment key={node.id}>
              <button
                onClick={() => onSelectPerson(node.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 hover:border-amber-400/60 transition-all shrink-0 font-medium text-slate-200"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: node.avatarColor || '#38bdf8' }}
                />
                <span className="truncate max-w-[120px]">{node.name}</span>
                <span className="text-[10px] text-amber-400 font-bold">#{idx + 1}</span>
              </button>

              {step && (
                <div className="flex items-center gap-1 px-1 text-slate-400 shrink-0">
                  <span className="text-[10px] uppercase font-semibold text-amber-400/80 max-w-[90px] truncate">
                    {step.relationship.type === 'custom' && step.relationship.customType
                      ? step.relationship.customType
                      : RELATIONSHIP_LABELS[step.relationship.type] || 'connected'}
                  </span>
                  <ChevronRight className="w-3 h-3 text-amber-500/60" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
