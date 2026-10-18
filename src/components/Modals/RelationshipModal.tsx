import React, { useState, useEffect, useMemo } from 'react';
import { X, Link2, Trash2, Users, Tag, Check, Search } from 'lucide-react';
import {
  RELATIONSHIP_LABELS,
  type Person,
  type Relationship,
  type RelationshipType,
} from '../../types/graph';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    sourceId: string,
    targetIds: string[],
    relData: {
      type: RelationshipType;
      customType?: string;
      closeness?: number;
      since?: string;
      notes?: string;
    }
  ) => void;
  onDelete?: (id: string) => void;
  editingRelationship?: Relationship | null;
  initialSourceId?: string;
  initialTargetId?: string;
  allPeople: Person[];
  allRelationships: Relationship[];
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingRelationship,
  initialSourceId,
  initialTargetId,
  allPeople,
  allRelationships,
}) => {
  const [sourceId, setSourceId] = useState('');
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [peopleFilter, setPeopleFilter] = useState('');
  const [type, setType] = useState<RelationshipType>('friend');
  const [customType, setCustomType] = useState('');
  const [closeness, setCloseness] = useState(3);
  const [since, setSince] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set of person IDs already connected with sourceId
  const alreadyConnectedSet = useMemo(() => {
    const set = new Set<string>();
    if (!sourceId) return set;
    for (const r of allRelationships) {
      if (editingRelationship && r.id === editingRelationship.id) continue;
      const s = typeof r.source === 'object' ? (r.source as any).id : r.source;
      const t = typeof r.target === 'object' ? (r.target as any).id : r.target;
      if (s === sourceId) set.add(t);
      if (t === sourceId) set.add(s);
    }
    return set;
  }, [sourceId, allRelationships, editingRelationship]);

  // Candidates for target (everyone except sourceId)
  const candidatePeople = useMemo(() => {
    return allPeople.filter((p) => p.id !== sourceId);
  }, [allPeople, sourceId]);

  // Groups/tags present among candidate people
  const tagGroups = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of candidatePeople) {
      if (p.tags && Array.isArray(p.tags)) {
        for (const t of p.tags) {
          const trimmed = t.trim();
          if (trimmed) {
            if (!map.has(trimmed)) map.set(trimmed, []);
            map.get(trimmed)!.push(p);
          }
        }
      }
    }
    return Array.from(map.entries())
      .filter(([_, list]) => list.length > 0)
      .sort((a, b) => b[1].length - a[1].length);
  }, [candidatePeople]);

  useEffect(() => {
    setError(null);
    setPeopleFilter('');
    if (editingRelationship) {
      const s =
        typeof editingRelationship.source === 'object'
          ? (editingRelationship.source as any).id
          : editingRelationship.source;
      const t =
        typeof editingRelationship.target === 'object'
          ? (editingRelationship.target as any).id
          : editingRelationship.target;

      setSourceId(s);
      setSelectedTargetIds([t]);
      setType(editingRelationship.type || 'friend');
      setCustomType(editingRelationship.customType || '');
      setCloseness(editingRelationship.closeness || 3);
      setSince(editingRelationship.since || '');
      setNotes(editingRelationship.notes || '');
    } else {
      const initialS = initialSourceId || (allPeople.length > 0 ? allPeople[0].id : '');
      setSourceId(initialS);

      if (initialTargetId && initialTargetId !== initialS) {
        setSelectedTargetIds([initialTargetId]);
      } else {
        setSelectedTargetIds([]);
      }

      setType('friend');
      setCustomType('');
      setCloseness(3);
      setSince('');
      setNotes('');
    }
  }, [editingRelationship, initialSourceId, initialTargetId, allPeople, isOpen]);

  if (!isOpen) return null;

  // Toggle individual person
  const toggleTargetSelection = (id: string) => {
    if (alreadyConnectedSet.has(id)) return;
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Toggle circle/tag group
  const toggleTagGroup = (tagName: string) => {
    const groupMembers = candidatePeople
      .filter((p) => p.tags && p.tags.includes(tagName) && !alreadyConnectedSet.has(p.id))
      .map((p) => p.id);

    if (groupMembers.length === 0) return;

    setSelectedTargetIds((prev) => {
      const allSelected = groupMembers.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !groupMembers.includes(id));
      } else {
        return Array.from(new Set([...prev, ...groupMembers]));
      }
    });
  };

  const selectAllCandidates = () => {
    const available = candidatePeople
      .filter((p) => !alreadyConnectedSet.has(p.id))
      .map((p) => p.id);
    setSelectedTargetIds(available);
  };

  const clearSelection = () => {
    setSelectedTargetIds([]);
  };

  // Filtered candidate list
  const filteredCandidates = candidatePeople.filter((p) => {
    if (!peopleFilter.trim()) return true;
    const q = peopleFilter.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.nickname && p.nickname.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceId) {
      setError('Please select a starting person.');
      return;
    }

    if (selectedTargetIds.length === 0) {
      setError('Please select at least one person to connect with.');
      return;
    }

    onSave(sourceId, selectedTargetIds, {
      type,
      customType: type === 'custom' ? customType.trim() : undefined,
      closeness,
      since: since.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const sourcePerson = allPeople.find((p) => p.id === sourceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Link2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {editingRelationship ? 'Edit Relationship' : 'Connect People'}
              </h3>
              <p className="text-xs text-slate-400">
                {editingRelationship
                  ? 'Update relationship details'
                  : 'Link individuals or connect to an entire circle'}
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Source Person Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Connect From <span className="text-rose-400">*</span>
            </label>
            <select
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                setSelectedTargetIds([]);
              }}
              disabled={!!editingRelationship}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60 font-medium"
            >
              <option value="">Select a person...</option>
              {allPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.nickname ? `("${p.nickname}")` : ''}{' '}
                  {p.tags.length > 0 ? `• #${p.tags[0]}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Section (Single or Multi-select with Tag auto-connect) */}
          {editingRelationship ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Connected With <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedTargetIds[0] || ''}
                onChange={(e) => setSelectedTargetIds([e.target.value])}
                disabled
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none disabled:opacity-60"
              >
                {allPeople
                  .filter((p) => p.id !== sourceId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.nickname ? `("${p.nickname}")` : ''}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3">
              {/* One-Click Circle / Group Connectors */}
              {tagGroups.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-sky-400" />
                      <span>Connect Entire Circle / Tag:</span>
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={selectAllCandidates}
                        className="text-sky-400 hover:text-sky-300 underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-slate-400 hover:text-rose-300 underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {tagGroups.map(([tagName, members]) => {
                      const availableMembers = members.filter(
                        (m) => !alreadyConnectedSet.has(m.id)
                      );
                      const allMembersSelected =
                        availableMembers.length > 0 &&
                        availableMembers.every((m) => selectedTargetIds.includes(m.id));
                      const someMembersSelected =
                        !allMembersSelected &&
                        members.some((m) => selectedTargetIds.includes(m.id));

                      return (
                        <button
                          type="button"
                          key={tagName}
                          onClick={() => toggleTagGroup(tagName)}
                          disabled={availableMembers.length === 0}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                            availableMembers.length === 0
                              ? 'opacity-40 bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                              : allMembersSelected
                              ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20'
                              : someMembersSelected
                              ? 'bg-sky-500/10 border-sky-500/50 text-sky-300'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                          }`}
                          title={
                            availableMembers.length === 0
                              ? `All members in #${tagName} are already connected`
                              : `Click to connect ${availableMembers.length} people in #${tagName}`
                          }
                        >
                          <Tag className="w-3 h-3 text-sky-400" />
                          <span>#{tagName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 font-bold">
                            {members.length}
                          </span>
                          {allMembersSelected && <Check className="w-3 h-3 text-sky-300" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People Selection Cards with Live Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-sky-400" />
                    <span>
                      Connect With (
                      <strong className="text-sky-300">{selectedTargetIds.length}</strong>{' '}
                      selected):
                    </span>
                  </span>
                </div>

                {/* Filter search input */}
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={peopleFilter}
                    onChange={(e) => setPeopleFilter(e.target.value)}
                    placeholder="Filter people by name or tag..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* People selection grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1 bg-slate-950/60 border border-slate-800/80 rounded-xl scrollbar-thin">
                  {filteredCandidates.map((person) => {
                    const isAlreadyConnected = alreadyConnectedSet.has(person.id);
                    const isSelected = selectedTargetIds.includes(person.id);

                    return (
                      <button
                        type="button"
                        key={person.id}
                        disabled={isAlreadyConnected}
                        onClick={() => toggleTargetSelection(person.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isAlreadyConnected
                            ? 'opacity-45 bg-slate-900/40 border-slate-800/50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-sky-500/15 border-sky-500/60 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                            isAlreadyConnected
                              ? 'border-slate-700 bg-slate-800 text-slate-500'
                              : isSelected
                              ? 'bg-sky-500 border-sky-400 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {(isSelected || isAlreadyConnected) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>

                        {/* Avatar */}
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                          style={{ backgroundColor: person.avatarColor || '#38bdf8' }}
                        >
                          {(person.name || '?')[0].toUpperCase()}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight flex items-center justify-between">
                            <span className="truncate">{person.name}</span>
                            {isAlreadyConnected && (
                              <span className="text-[9px] text-slate-500 uppercase font-medium shrink-0 ml-1">
                                Connected
                              </span>
                            )}
                          </p>
                          {person.tags.length > 0 && (
                            <p className="text-[10px] text-slate-400 truncate">
                              #{person.tags[0]}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Relationship Parameters */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Connection Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Relationship Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RelationshipType)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'custom' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Custom Description
                  </label>
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Bandmate, Gym Buddy"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Since When (Optional)
                  </label>
                  <input
                    type="text"
                    value={since}
                    onChange={(e) => setSince(e.target.value)}
                    placeholder="e.g. 2022, Freshman Year"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}
            </div>

            {/* Closeness */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Connection Strength
                </label>
                <span className="text-xs text-sky-400 font-bold">
                  {closeness === 1 && 'Acquaintance'}
                  {closeness === 2 && 'Casual'}
                  {closeness === 3 && 'Good Friends'}
                  {closeness === 4 && 'Very Close'}
                  {closeness === 5 && 'Inner Circle'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={closeness}
                onChange={(e) => setCloseness(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Shared Context / Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Connection Context & Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Met at University hackathon, co-direct film festival..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {editingRelationship && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this relationship?')) {
                    onDelete(editingRelationship.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="text-xs text-slate-400">
                {sourcePerson && selectedTargetIds.length > 0 && (
                  <span>
                    Linking <strong>{sourcePerson.name}</strong> to{' '}
                    <strong className="text-sky-300">{selectedTargetIds.length}</strong>{' '}
                    {selectedTargetIds.length === 1 ? 'person' : 'people'}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editingRelationship && selectedTargetIds.length === 0}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {editingRelationship
                  ? 'Update Connection'
                  : selectedTargetIds.length === 1
                  ? 'Connect 1 Person'
                  : selectedTargetIds.length > 1
                  ? `Connect ${selectedTargetIds.length} People`
                  : 'Connect People'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
