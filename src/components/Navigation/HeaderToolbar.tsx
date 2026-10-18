import React, { useRef, useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  Link2,
  Sparkles,
  Share2,
  Database,
  X,
  HardDrive,
  Globe,
  LogIn,
  LogOut,
  Crown,
  Shield,
  Eye,
  ChevronDown,
} from 'lucide-react';
import type { Person, SharedMap, StorageMode, UserProfile } from '../../types/graph';

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

  // Collaboration & Auth Props
  storageMode: StorageMode;
  activeMap: SharedMap | null;
  currentUser: UserProfile | null;
  canEdit: boolean;
  onOpenMapsModal: () => void;
  onOpenShareModal: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
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
  storageMode,
  activeMap,
  currentUser,
  canEdit,
  onOpenMapsModal,
  onOpenShareModal,
  onOpenAuthModal,
  onSignOut,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: '/' or 'Ctrl+K' focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          setIsSearchFocused(false);
        }
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const currentMemberRole = currentUser && activeMap ? activeMap.members[currentUser.uid]?.role : null;

  return (
    <header className="fixed top-4 inset-x-4 sm:inset-x-6 z-30 flex items-center justify-between gap-3 pointer-events-none">
      {/* Brand & Map Mode Pill */}
      <div className="flex items-center gap-2 p-1.5 pl-3 pr-3.5 bg-[#0d1322]/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-xl shadow-black/50 pointer-events-auto select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-sky-500/20">
            <Share2 className="w-4 h-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>Human Web</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                6°
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden lg:block">
              {peopleCount} {peopleCount === 1 ? 'person' : 'people'} • {relationshipCount}{' '}
              {relationshipCount === 1 ? 'connection' : 'connections'}
            </p>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {/* Map Switcher Button */}
        <button
          onClick={onOpenMapsModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all"
          title="Switch between Local and Shared Cloud Maps"
        >
          {storageMode === 'local' ? (
            <>
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              <span className="max-w-[100px] truncate hidden sm:inline">Local Map</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[110px] truncate text-emerald-300">
                {activeMap?.title || 'Shared Map'}
              </span>
              {currentMemberRole === 'owner' ? (
                <Crown className="w-3 h-3 text-amber-400" />
              ) : currentMemberRole === 'editor' ? (
                <Shield className="w-3 h-3 text-emerald-400" />
              ) : (
                <Eye className="w-3 h-3 text-slate-400" />
              )}
            </>
          )}
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Cloud Share Button (Visible when in Cloud Mode) */}
        {storageMode === 'cloud' && (
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-semibold text-sky-300 transition-all"
            title="Invite collaborators to this shared map"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        )}
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

        {canEdit && (
          <>
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
          </>
        )}

        <button
          onClick={onOpenImportExport}
          className="p-2 bg-[#0d1322]/85 hover:bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white rounded-2xl shadow-xl shadow-black/50 backdrop-blur-md transition-all"
          title="Backup, export, or reset network"
        >
          <Database className="w-4 h-4" />
        </button>

        {/* User Account / Sign In Pill */}
        <div className="relative" ref={userMenuRef}>
          {currentUser ? (
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 bg-[#0d1322]/85 hover:bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl shadow-black/50 transition-all"
              title={`Signed in as ${currentUser.displayName}`}
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL || undefined}
                  alt={currentUser.displayName || 'User avatar'}
                  className="w-7 h-7 rounded-xl object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  {(currentUser.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1322]/85 hover:bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-semibold rounded-2xl shadow-xl shadow-black/50 backdrop-blur-md transition-all"
              title="Sign in for shared cloud graphs"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && currentUser && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d1322]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-bold text-slate-100 truncate">{currentUser.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email || 'Guest User'}</p>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenMapsModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mt-1"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>My Cloud Maps</span>
              </button>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
