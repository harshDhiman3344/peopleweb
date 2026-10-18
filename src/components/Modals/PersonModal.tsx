import React, { useState, useEffect, useMemo } from 'react';
import { X, Link2, Users, Check, Search, Tag } from 'lucide-react';
import { RELATIONSHIP_LABELS, type Person, type RelationshipType } from '../../types/graph';
import { CONSTELLATION_PALETTE, getDeterministicColor } from '../../utils/color';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>,
    connectToIds?: string[],
    connectionDetails?: {
      type: RelationshipType;
      customType?: string;
      closeness?: number;
      since?: string;
      notes?: string;
    }
  ) => void;
  editingPerson?: Person | null;
  initialConnectPerson?: Person | null;
  existingTags: string[];
  allPeople: Person[];
}

export const PersonModal: React.FC<PersonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPerson,
  initialConnectPerson,
  existingTags,
  allPeople,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [avatarColor, setAvatarColor] = useState(CONSTELLATION_PALETTE[0]);

  // Direct multi-connection fields
  const [shouldConnect, setShouldConnect] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [peopleFilter, setPeopleFilter] = useState('');
  const [relType, setRelType] = useState<RelationshipType>('friend');
  const [customRelType, setCustomRelType] = useState('');
  const [closeness, setCloseness] = useState(3);
  const [sinceWhen, setSinceWhen] = useState('');
  const [relNotes, setRelNotes] = useState('');

  // Groups/tags present among all people
  const tagGroups = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of allPeople) {
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
  }, [allPeople]);

  useEffect(() => {
    if (editingPerson) {
      setName(editingPerson.name || '');
      setNickname(editingPerson.nickname || '');
      setTags(editingPerson.tags || []);
      setNotes(editingPerson.notes || '');
      setAvatarColor(editingPerson.avatarColor || getDeterministicColor(editingPerson.name));
      setShouldConnect(false);
      setSelectedPersonIds([]);
    } else {
      setName('');
      setNickname('');
      setTags([]);
      setNotes('');
      setPeopleFilter('');
      setAvatarColor(CONSTELLATION_PALETTE[Math.floor(Math.random() * CONSTELLATION_PALETTE.length)]);

      if (initialConnectPerson) {
        setShouldConnect(true);
        setSelectedPersonIds([initialConnectPerson.id]);
        setRelType('friend');
        setCustomRelType('');
        setCloseness(3);
        setSinceWhen('');
        setRelNotes('');
      } else {
        setShouldConnect(false);
        setSelectedPersonIds([]);
        setRelType('friend');
        setCustomRelType('');
        setCloseness(3);
        setSinceWhen('');
        setRelNotes('');
      }
    }
  }, [editingPerson, initialConnectPerson, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = (tagToAdd?: string) => {
    const val = (tagToAdd || tagInput).trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Toggle individual person
  const togglePersonSelection = (id: string) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Toggle an entire circle / tag group
  const toggleTagGroup = (tagName: string) => {
    const groupMembers = allPeople
      .filter((p) => p.tags && p.tags.includes(tagName))
      .map((p) => p.id);
    if (groupMembers.length === 0) return;

    setSelectedPersonIds((prev) => {
      const allIncluded = groupMembers.every((id) => prev.includes(id));
      if (allIncluded) {
        // Deselect all in this group
        return prev.filter((id) => !groupMembers.includes(id));
      } else {
        // Add all members of this group
        return Array.from(new Set([...prev, ...groupMembers]));
      }
    });
  };

  const selectAllPeople = () => {
    setSelectedPersonIds(allPeople.map((p) => p.id));
  };

  const deselectAllPeople = () => {
    setSelectedPersonIds([]);
  };

  // Filtered people for selector
  const filteredPeople = allPeople.filter((p) => {
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
    if (!name.trim()) return;

    const personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      tags,
      notes: notes.trim() || undefined,
      avatarColor,
    };

    if (!editingPerson && shouldConnect && selectedPersonIds.length > 0) {
      onSave(personData, selectedPersonIds, {
        type: relType,
        customType: relType === 'custom' ? customRelType.trim() : undefined,
        closeness,
        since: sinceWhen.trim() || undefined,
        notes: relNotes.trim() || undefined,
      });
    } else {
      onSave(personData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: avatarColor }}
            />
            <h3 className="text-lg font-bold text-slate-100">
              {editingPerson ? 'Edit Person' : 'Add New Person'}
            </h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingPerson && e.target.value.length === 1) {
                    setAvatarColor(getDeterministicColor(e.target.value));
                  }
                }}
                placeholder="e.g. Maya Patel"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nickname / Handle
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. May"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Node Celestial Aura
            </label>
            <div className="flex flex-wrap gap-2">
              {CONSTELLATION_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    avatarColor === c
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0d1322]'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Circles & Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tags (press Enter)..."
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
              >
                Add
              </button>
            </div>

            {/* Selected Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-sky-300 border border-slate-700"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag suggestions */}
            {existingTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-400">
                <span className="self-center mr-1">Suggestions:</span>
                {existingTags.slice(0, 5).map((et) => (
                  <button
                    type="button"
                    key={et}
                    onClick={() => handleAddTag(et)}
                    className="hover:text-sky-300 underline"
                  >
                    +{et}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes & Bio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Met at the Fall Hackathon. Senior robotics lead..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* Multi-Connection & Group Auto-Connect Section */}
          {!editingPerson && (
            <div className="p-4 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-sky-500/20 text-sky-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>Connect to People & Circles</span>
                      <span className="text-[10px] text-sky-400 font-normal border border-sky-500/30 px-1.5 py-0.2 rounded-full">
                        Optional
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Connect to individual acquaintances or an entire circle/group at once
                    </p>
                  </div>
                </div>

                {allPeople.length > 0 ? (
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={shouldConnect}
                      onChange={(e) => {
                        setShouldConnect(e.target.checked);
                        if (e.target.checked && selectedPersonIds.length === 0 && allPeople.length > 0) {
                          setSelectedPersonIds([allPeople[0].id]);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">First node</span>
                )}
              </div>

              {shouldConnect && allPeople.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-3.5 animate-in fade-in duration-200">
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
                            onClick={selectAllPeople}
                            className="text-sky-400 hover:text-sky-300 underline"
                          >
                            Select All ({allPeople.length})
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={deselectAllPeople}
                            className="text-slate-400 hover:text-rose-300 underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {tagGroups.map(([tagName, members]) => {
                          const allMembersSelected = members.every((m) =>
                            selectedPersonIds.includes(m.id)
                          );
                          const someMembersSelected =
                            !allMembersSelected &&
                            members.some((m) => selectedPersonIds.includes(m.id));

                          return (
                            <button
                              type="button"
                              key={tagName}
                              onClick={() => toggleTagGroup(tagName)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                allMembersSelected
                                  ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm shadow-sky-500/20'
                                  : someMembersSelected
                                  ? 'bg-sky-500/10 border-sky-500/50 text-sky-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                              }`}
                              title={`Click to connect all ${members.length} people in #${tagName}`}
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

                  {/* Multi-Select People List with Search */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-sky-400" />
                        <span>Select People ({selectedPersonIds.length} selected):</span>
                      </span>
                    </div>

                    {/* Filter input */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={peopleFilter}
                        onChange={(e) => setPeopleFilter(e.target.value)}
                        placeholder="Filter acquaintances by name or tag..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* People Selection Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/60 border border-slate-800/80 rounded-xl scrollbar-thin">
                      {filteredPeople.map((person) => {
                        const isSelected = selectedPersonIds.includes(person.id);
                        return (
                          <button
                            type="button"
                            key={person.id}
                            onClick={() => togglePersonSelection(person.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'bg-sky-500/15 border-sky-500/60 text-white'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Checkbox indicator */}
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                                isSelected
                                  ? 'bg-sky-500 border-sky-400 text-slate-950'
                                  : 'border-slate-600 bg-slate-800'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            {/* Initials & Info */}
                            <span
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                              style={{ backgroundColor: person.avatarColor || '#38bdf8' }}
                            >
                              {(person.name || '?')[0].toUpperCase()}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {person.name}
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

                  {/* Shared Relationship Settings for Selected Connections */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Connection Parameters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Relationship Type
                        </label>
                        <select
                          value={relType}
                          onChange={(e) => setRelType(e.target.value as RelationshipType)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>

                      {relType === 'custom' ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Custom Type
                          </label>
                          <input
                            type="text"
                            value={customRelType}
                            onChange={(e) => setCustomRelType(e.target.value)}
                            placeholder="e.g. Bandmate, Gym Buddy"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Since When (Optional)
                          </label>
                          <input
                            type="text"
                            value={sinceWhen}
                            onChange={(e) => setSinceWhen(e.target.value)}
                            placeholder="e.g. 2023, High School"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Connection Closeness
                        </label>
                        <span className="text-[11px] text-sky-400 font-medium">
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

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Shared Context / Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={relNotes}
                        onChange={(e) => setRelNotes(e.target.value)}
                        placeholder="e.g. Joined the club together this semester"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg shadow-lg shadow-sky-500/20 transition-all"
            >
              {editingPerson
                ? 'Save Changes'
                : shouldConnect && selectedPersonIds.length > 0
                ? selectedPersonIds.length === 1
                  ? 'Create & Connect (1 Person)'
                  : `Create & Connect (${selectedPersonIds.length} People)`
                : 'Create Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
