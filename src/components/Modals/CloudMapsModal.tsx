import React, { useState } from 'react';
import {
  X,
  Cloud,
  HardDrive,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Globe,
  LogIn,
  Sparkles,
} from 'lucide-react';
import type { HumanWebData, SharedMap, StorageMode, UserProfile } from '../../types/graph';
import { isFirebaseConfigured } from '../../services/firebase';
import { parseAndValidateJsonFile } from '../../utils/exportImport';

interface CloudMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageMode: StorageMode;
  activeMap: SharedMap | null;
  userMaps: SharedMap[];
  currentUser: UserProfile | null;
  currentLocalData: HumanWebData;
  onSwitchToLocal: () => void;
  onSwitchToCloudMap: (mapId: string) => Promise<void>;
  onCreateCloudMap: (title: string, description: string) => Promise<string>;
  onMigrateToCloud: (title: string, data: HumanWebData) => Promise<{ mapId: string; peopleCount: number; relationshipCount: number }>;
  onOpenAuth: () => void;
  onOpenShareModal: () => void;
}

export const CloudMapsModal: React.FC<CloudMapsModalProps> = ({
  isOpen,
  onClose,
  storageMode,
  activeMap,
  userMaps,
  currentUser,
  currentLocalData,
  onSwitchToLocal,
  onSwitchToCloudMap,
  onCreateCloudMap,
  onMigrateToCloud,
  onOpenAuth,
  onOpenShareModal,
}) => {
  const [tab, setTab] = useState<'switch' | 'create' | 'migrate'>('switch');

  // Create state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Migrate state
  const [migrationTitle, setMigrationTitle] = useState('My Shared Social Web');
  const [migrationSource, setMigrationSource] = useState<'current_local' | 'json_file'>('current_local');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<HumanWebData | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isFirebaseConfigured();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError(null);
    setIsCreating(true);
    try {
      await onCreateCloudMap(newTitle.trim(), newDescription.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create map.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const data = await parseAndValidateJsonFile(file);
      setUploadedFile(file);
      setUploadedData(data);
      if (!migrationTitle || migrationTitle === 'My Shared Social Web') {
        setMigrationTitle(file.name.replace('.json', ''));
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Human Web JSON format.');
      setUploadedFile(null);
      setUploadedData(null);
    }
  };

  const handleRunMigration = async () => {
    setError(null);
    setIsMigrating(true);
    setMigrationSuccess(null);
    try {
      const dataToMigrate =
        migrationSource === 'current_local' ? currentLocalData : uploadedData;

      if (!dataToMigrate) {
        throw new Error('No data available to migrate.');
      }

      const result = await onMigrateToCloud(
        migrationTitle.trim() || 'Shared Social Map',
        dataToMigrate
      );

      setMigrationSuccess(
        `Migration complete! Transferred ${result.peopleCount} people and ${result.relationshipCount} connections to your shared cloud map.`
      );
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Migration to Firestore failed.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0d1322] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Maps & Cloud Sync</h3>
              <p className="text-xs text-slate-400">
                {storageMode === 'local' ? 'Currently viewing Local Map' : `Viewing Cloud: ${activeMap?.title || 'Shared Map'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 pt-3 gap-6">
          <button
            onClick={() => { setTab('switch'); setError(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'switch'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Select Map ({userMaps.length + 1})</span>
          </button>
          <button
            onClick={() => { setTab('migrate'); setError(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'migrate'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Migrate to Cloud</span>
          </button>
          <button
            onClick={() => { setTab('create'); setError(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'create'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Cloud Map</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Missing Firebase warning if applicable */}
          {!isConfigured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-amber-200">Firebase configuration not detected</p>
                <p className="text-amber-300/80 leading-relaxed">
                  To enable live shared maps across friends' devices, add your Firebase configuration in{' '}
                  <code className="text-amber-100 font-mono">.env.local</code> or Vercel Environment Variables.
                </p>
              </div>
            </div>
          )}

          {/* User Sign-In Banner if not signed in */}
          {isConfigured && !currentUser && (
            <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Sign in to sync & share</h4>
                <p className="text-[11px] text-slate-400">Collaborate live with your friends on shared constellations.</p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* TAB 1: SWITCH MAPS */}
          {tab === 'switch' && (
            <div className="space-y-4">
              {/* Local Storage Option */}
              <div
                onClick={() => {
                  onSwitchToLocal();
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  storageMode === 'local'
                    ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-sky-400 border border-slate-700">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-100">Local Private Map</h4>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        IndexedDB
                      </span>
                      {storageMode === 'local' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Stored only in this browser's database. Completely private.
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {currentLocalData.people.length} people
                </div>
              </div>

              {/* Cloud Maps Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Shared Cloud Maps ({userMaps.length})
                  </span>
                  {currentUser && (
                    <span className="text-[10px] text-slate-400">
                      Signed in as <span className="text-slate-200">{currentUser.displayName}</span>
                    </span>
                  )}
                </div>

                {userMaps.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                    <Cloud className="w-8 h-8 mx-auto mb-2 text-slate-400/50" />
                    <p>No shared cloud maps found yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Create a new map or migrate your existing local graph!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userMaps.map((m) => {
                      const isActive = storageMode === 'cloud' && activeMap?.id === m.id;
                      const memberCount = Object.keys(m.members || {}).length;
                      return (
                        <div
                          key={m.id}
                          onClick={async () => {
                            await onSwitchToCloudMap(m.id);
                            onClose();
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isActive
                              ? 'bg-sky-500/10 border-sky-500/50 shadow-lg shadow-sky-500/10'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-100">{m.title}</h4>
                                {isActive && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Owner: {m.ownerName}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                </span>
                              </p>
                            </div>
                          </div>
                          {isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                onOpenShareModal();
                              }}
                              className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold rounded-lg border border-sky-500/40 transition-colors"
                            >
                              Share
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXPLICIT MIGRATION FLOW */}
          {tab === 'migrate' && (
            <div className="space-y-4">
              <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Preserve Existing IDs & Positions
                </p>
                <p className="text-slate-300/80 leading-relaxed text-[11px]">
                  This migration transfers your existing graph into Cloud Firestore with exact ID preservation, preventing duplicates and keeping all custom pinned coordinates intact.
                </p>
              </div>

              {/* Migration Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Shared Map Name
                </label>
                <input
                  type="text"
                  value={migrationTitle}
                  onChange={(e) => setMigrationTitle(e.target.value)}
                  placeholder="e.g. My College Social Web"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Source Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Migration Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMigrationSource('current_local')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      migrationSource === 'current_local'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Current Local Graph</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {currentLocalData.people.length} people, {currentLocalData.relationships.length} connections
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMigrationSource('json_file')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      migrationSource === 'json_file'
                        ? 'bg-sky-500/15 border-sky-500 text-sky-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Exported JSON File</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Upload previously exported file
                    </p>
                  </button>
                </div>
              </div>

              {/* If JSON File source chosen, file input */}
              {migrationSource === 'json_file' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select JSON Export File
                  </label>
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl bg-slate-900/40 cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-300">
                      {uploadedFile ? uploadedFile.name : 'Click to select human-web-backup.json'}
                    </span>
                    {uploadedData && (
                      <span className="text-[10px] text-emerald-400 mt-1 font-semibold">
                        ✓ Validated: {uploadedData.people.length} people, {uploadedData.relationships.length} connections
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {migrationSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{migrationSuccess}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunMigration}
                disabled={
                  isMigrating ||
                  !currentUser ||
                  (migrationSource === 'json_file' && !uploadedData)
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all mt-4"
              >
                <Upload className="w-4 h-4 text-slate-950" />
                <span>{isMigrating ? 'Migrating to Cloud Firestore...' : 'Start Migration to Shared Cloud'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: CREATE NEW CLOUD MAP */}
          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Map Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Stanford Class of '26 Web"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Shared map of our friends, clubs, and campus connections..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !newTitle.trim() || !currentUser}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition-all"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>{isCreating ? 'Creating Map...' : 'Create Shared Cloud Map'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">
            {storageMode === 'local' ? '🔒 Local mode (offline)' : '🌐 Cloud mode (real-time sync)'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
