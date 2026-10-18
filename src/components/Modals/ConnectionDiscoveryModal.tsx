import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { RELATIONSHIP_LABELS, type PathResult, type Person } from '../../types/graph';

interface ConnectionDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPeople: Person[];
  initialSourceId?: string;
  onDiscover: (sourceId: string, targetId: string) => PathResult;
}

export const ConnectionDiscoveryModal: React.FC<ConnectionDiscoveryModalProps> = ({
  isOpen,
  onClose,
  allPeople,
  initialSourceId,
  onDiscover,
}) => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<PathResult | null>(null);

  useEffect(() => {
    setResult(null);
    if (initialSourceId) {
      setSourceId(initialSourceId);
      const other = allPeople.find((p) => p.id !== initialSourceId);
      if (other) setTargetId(other.id);
    } else if (allPeople.length >= 2) {
      setSourceId(allPeople[0].id);
      setTargetId(allPeople[allPeople.length - 1].id);
    }
  }, [initialSourceId, allPeople, isOpen]);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
    setResult(null);
  };

  const handleCalculate = (s = sourceId, t = targetId) => {
    if (!s || !t) return;
    const res = onDiscover(s, t);
    setResult(res);
  };

  const handleApplySuggestion = (sId: string, tId: string) => {
    setSourceId(sId);
    setTargetId(tId);
    handleCalculate(sId, tId);
  };

  // Find sample candidates
  const maya = allPeople.find((p) => p.name.includes('Maya'));
  const david = allPeople.find((p) => p.name.includes('David'));
  const elena = allPeople.find((p) => p.name.includes('Elena'));
  const ethan = allPeople.find((p) => p.name.includes('Ethan'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                Degrees of Separation
              </h3>
              <p className="text-xs text-amber-300/80">
                Trace shortest connection path through mutual acquaintances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Starting Person
              </label>
              <select
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setResult(null);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400"
              >
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.nickname ? `(${p.nickname})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap individuals"
              className="mt-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Person
              </label>
              <select
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  setResult(null);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-400"
              >
                {allPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.nickname ? `(${p.nickname})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick suggestions */}
          {maya && david && (
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Suggested exploration:
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleApplySuggestion(maya.id, david.id)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 rounded-lg transition-colors"
                >
                  {maya.name} → {david.name}
                </button>
                {elena && ethan && (
                  <button
                    type="button"
                    onClick={() => handleApplySuggestion(elena.id, ethan.id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 rounded-lg transition-colors"
                  >
                    {elena.name} → {ethan.name}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div
              className={`p-4 rounded-xl border ${
                result.found
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.found ? (
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <span
                  className={`text-sm font-bold ${
                    result.found ? 'text-amber-300' : 'text-rose-300'
                  }`}
                >
                  {result.found
                    ? result.degrees === 0
                      ? 'Same Person (0 Degrees)'
                      : result.degrees === 1
                      ? 'Direct Connection (1st Degree)'
                      : `${result.degrees} Degrees of Separation`
                    : 'No Connection Path'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {result.explanation}
              </p>

              {result.found && result.steps.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-amber-500/20 text-xs">
                  {result.steps.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-200">
                      <span className="font-semibold text-amber-300">{st.from.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {st.relationship.type === 'custom' && st.relationship.customType
                          ? st.relationship.customType
                          : RELATIONSHIP_LABELS[st.relationship.type]}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="font-semibold text-amber-300">{st.to.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                handleCalculate();
                if (result?.found) {
                  onClose();
                }
              }}
              disabled={!sourceId || !targetId}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{result?.found ? 'View on Graph' : 'Discover Path'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
