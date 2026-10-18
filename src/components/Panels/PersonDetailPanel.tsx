import React, { useMemo } from 'react';
import {
  X,
  UserPlus,
  Sparkles,
  Edit2,
  Trash2,
  Tag,
  Link2,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { RELATIONSHIP_COLORS, RELATIONSHIP_LABELS, type Person, type Relationship } from '../../types/graph';
import { getDirectConnections } from '../../algorithms/pathFinder';

interface PersonDetailPanelProps {
  person: Person | null;
  allPeople: Person[];
  allRelationships: Relationship[];
  onClose: () => void;
  onEditPerson: (person: Person) => void;
  onDeletePerson: (id: string) => void;
  onSelectPerson: (id: string) => void;
  onAddConnectionFromPerson: (person: Person) => void;
  onAddNewPersonConnectedTo?: (person: Person) => void;
  onDiscoverFromPerson: (person: Person) => void;
  onDeleteRelationship: (relId: string) => void;
  onEditRelationship?: (rel: Relationship) => void;
  canEdit?: boolean;
}

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  allPeople,
  allRelationships,
  onClose,
  onEditPerson,
  onDeletePerson,
  onSelectPerson,
  onAddConnectionFromPerson,
  onAddNewPersonConnectedTo,
  onDiscoverFromPerson,
  onDeleteRelationship,
  canEdit = true,
}) => {
  if (!person) return null;

  const directConnections = useMemo(() => {
    return getDirectConnections(person.id, allPeople, allRelationships);
  }, [person.id, allPeople, allRelationships]);

  const initials = useMemo(() => {
    const parts = (person.name || '?').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [person.name]);

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-[#0d1322]/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl shadow-black/80 flex flex-col transition-transform duration-300 ease-out"
    >
      {/* Header */}
      <div className="relative p-5 border-b border-slate-800 flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-white/10"
            style={{
              backgroundColor: person.avatarColor || '#38bdf8',
              color: '#080c16',
            }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              {person.name}
            </h2>
            {person.nickname && (
              <p className="text-xs text-sky-400 font-medium">"{person.nickname}"</p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {directConnections.length}{' '}
              {directConnections.length === 1 ? 'connection' : 'connections'} in network
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className={`p-3 bg-slate-900/60 border-b border-slate-800/80 ${canEdit ? 'grid grid-cols-3 gap-1.5' : 'flex justify-center'}`}>
        <button
          onClick={() => onDiscoverFromPerson(person)}
          className={`flex flex-col items-center justify-center gap-1 px-2 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[11px] font-semibold rounded-lg transition-all ${!canEdit ? 'w-full' : ''}`}
          title="Find shortest path"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Six Degrees Path</span>
        </button>

        {canEdit && (
          <>
            <button
              onClick={() => onAddConnectionFromPerson(person)}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-sky-500/20 border border-sky-500/40 hover:border-sky-400 text-sky-300 hover:text-sky-200 text-[11px] font-semibold rounded-lg transition-all"
              title="Connect with existing person"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>

            {onAddNewPersonConnectedTo ? (
              <button
                onClick={() => onAddNewPersonConnectedTo(person)}
                className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold rounded-lg transition-all"
                title="Create new person connected directly"
              >
                <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                <span>+ New Person</span>
              </button>
            ) : (
              <div />
            )}
          </>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Tags */}
        {person.tags && person.tags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              <Tag className="w-3.5 h-3.5 text-sky-400" />
              <span>Circles & Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {person.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800/80 border border-slate-700/70 text-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {person.notes && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Notes & Background</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
              {person.notes}
            </div>
          </div>
        )}

        {/* Direct Connections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Link2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Direct Connections ({directConnections.length})</span>
            </div>
          </div>

          {directConnections.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-900/40 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">No relationships recorded yet.</p>
              <button
                onClick={() => onAddConnectionFromPerson(person)}
                className="mt-2 text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add first connection</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {directConnections.map(({ person: neighbor, relationship }) => {
                const relColor =
                  RELATIONSHIP_COLORS[relationship.type] || '#38bdf8';
                const relLabel =
                  relationship.type === 'custom' && relationship.customType
                    ? relationship.customType
                    : RELATIONSHIP_LABELS[relationship.type] || 'Connected';

                return (
                  <div
                    key={relationship.id}
                    className="p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectPerson(neighbor.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                          style={{ backgroundColor: neighbor.avatarColor || '#38bdf8' }}
                        >
                          {(neighbor.name || '?')[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate flex items-center gap-1.5">
                            {neighbor.name}
                            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: relColor }}
                            />
                            <span className="text-[11px] text-slate-400">{relLabel}</span>
                            {relationship.since && (
                              <span className="text-[10px] text-slate-500">
                                • Since {relationship.since}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onDeleteRelationship(relationship.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove connection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {relationship.notes && (
                      <p className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg italic border border-slate-800/60">
                        "{relationship.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Management */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
        {canEdit ? (
          <>
            <button
              onClick={() => onEditPerson(person)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to remove ${person.name} and all associated relationships?`
                  )
                ) {
                  onDeletePerson(person.id);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium rounded-lg border border-rose-500/30 transition-colors"
              title="Delete person from web"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </>
        ) : (
          <div className="w-full text-center py-1 text-xs text-slate-400">
            <span>Viewing shared constellation (Read-only)</span>
          </div>
        )}
      </div>
    </div>
  );
};
