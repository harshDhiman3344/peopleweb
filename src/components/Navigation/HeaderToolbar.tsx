import React, { useRef, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Link2,
  Sparkles,
  Share2,
  Database,
  X,
} from 'lucide-react';
import type { Person } from '../../types/graph';

interface HeaderToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  peopleCount: number;
  relationshipCount: number;
  onOpenAddPerson: () => void;
  onOpenAddRelationship: () => void;
  onOpenDiscovery: () => void;
  onOpenImportExport: () => void;
  allPeople: Person[];
  onSelectPerson: (id: string) => void;
}

export const HeaderToolbar: React.FC<HeaderToolbarProps> = ({
  searchQuery,
  onSearchChange,
  peopleCount,
  relationshipCount,
  onOpenAddPerson,
  onOpenAddRelationship,
  onOpenDiscovery,
  onOpenImportExport,
  allPeople,
  onSelectPerson,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // Keyboard shortcut: '/' or 'Ctrl+K' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allPeople
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nickname && p.nickname.toLowerCase().includes(q)) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searchQuery, allPeople]);

  return (
    <header className="fixed top-4 inset-x-4 sm:inset-x-6 z-30 flex items-center justify-between gap-3 pointer-events-none">
      {/* Brand & Stats pill */}
      <div className="flex items-center gap-3 p-1.5 pl-3.5 pr-4 bg-[#0d1322]/85 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-xl shadow-black/50 pointer-events-auto select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-sky-500/20">
            <Share2 className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>Human Web</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                6°
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'} • {relationshipCount}{' '}
              {relationshipCount === 1 ? 'connection' : 'connections'}
            </p>
          </div>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="relative flex-1 max-w-xs sm:max-w-md pointer-events-auto">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Search people, tags... (Press '/')"
            className="w-full pl-9 pr-8 py-2 bg-[#0d1322]/85 backdrop-blur-md border border-slate-700/60 focus:border-sky-500 rounded-2xl text-xs text-slate-100 placeholder-slate-400 shadow-xl shadow-black/50 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1322]/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
            {searchResults.map((person) => (
              <button
                key={person.id}
                onMouseDown={() => {
                  onSelectPerson(person.id);
                  onSearchChange('');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-950"
                    style={{ backgroundColor: person.avatarColor || '#38bdf8' }}
                  >
                    {(person.name || '?')[0].toUpperCase()}
                  </span>
                  <div>
                    <span className="text-xs font-medium text-slate-200">
                      {person.name}
                    </span>
                    {person.nickname && (
                      <span className="text-[11px] text-sky-400 ml-1.5">
                        "{person.nickname}"
                      </span>
                    )}
                  </div>
                </div>

                {person.tags.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    #{person.tags[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onOpenDiscovery}
          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-2xl shadow-xl shadow-amber-500/10 backdrop-blur-md transition-all"
          title="Find shortest path between any two people"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Six Degrees</span>
        </button>

        <button
          onClick={onOpenAddRelationship}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1322]/85 hover:bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium rounded-2xl shadow-xl shadow-black/50 backdrop-blur-md transition-all"
          title="Connect two people"
        >
          <Link2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Connect</span>
        </button>

        <button
          onClick={onOpenAddPerson}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-2xl shadow-xl shadow-sky-500/25 transition-all"
          title="Add a new person to web"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Person</span>
        </button>

        <button
          onClick={onOpenImportExport}
          className="p-2 bg-[#0d1322]/85 hover:bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white rounded-2xl shadow-xl shadow-black/50 backdrop-blur-md transition-all"
          title="Backup, export, or reset network"
        >
          <Database className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
