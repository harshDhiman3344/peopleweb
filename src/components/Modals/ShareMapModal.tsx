import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Shield,
  ShieldAlert,
  Crown,
  Link,
  Sparkles,
} from 'lucide-react';
import type { MapMemberRole, SharedMap, UserProfile } from '../../types/graph';

interface ShareMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMap: SharedMap | null;
  currentUser: UserProfile | null;
  onGenerateInvite: (role: MapMemberRole) => Promise<string>;
}

export const ShareMapModal: React.FC<ShareMapModalProps> = ({
  isOpen,
  onClose,
  activeMap,
  currentUser,
  onGenerateInvite,
}) => {
  const [selectedRole, setSelectedRole] = useState<MapMemberRole>('editor');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !activeMap) return null;

  const currentMember = currentUser ? activeMap.members[currentUser.uid] : null;
  const isOwner = currentMember?.role === 'owner' || activeMap.ownerId === currentUser?.uid;
  const canInvite = isOwner || currentMember?.role === 'editor';

  const membersList = Object.values(activeMap.members || {}).sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    return b.joinedAt - a.joinedAt;
  });

  const handleCreateInvite = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const token = await onGenerateInvite(selectedRole);
      const url = `${window.location.origin}${window.location.pathname}?join=${activeMap.id}&token=${token}`;
      setGeneratedLink(url);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invitation link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy link to clipboard. Please copy manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Share Graph</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xs">{activeMap.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Invite Link Generator Section */}
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Link className="w-4 h-4 text-sky-400" />
                <span>Create Invite Link</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as MapMemberRole);
                    setGeneratedLink(null);
                  }}
                  disabled={!canInvite}
                  className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                >
                  <option value="editor">Editor (Can edit graph)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>
            </div>

            {canInvite ? (
              <>
                {!generatedLink ? (
                  <button
                    onClick={handleCreateInvite}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>{isGenerating ? 'Generating Link...' : 'Generate New Invitation Link'}</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-slate-950/70 border border-sky-500/40 rounded-xl">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 bg-transparent text-xs text-sky-300 font-mono focus:outline-none select-all px-1 truncate"
                      />
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Anyone with this link will automatically join as{' '}
                      <span className="font-semibold text-slate-200 capitalize">{selectedRole}</span> when opened.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-amber-400/90 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Only the map owner and editors can generate invitation links.
              </p>
            )}

            {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">{error}</p>}
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Members ({membersList.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">Live synchronized</span>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden max-h-56 overflow-y-auto">
              {membersList.map((member) => {
                const isCurrentUser = currentUser?.uid === member.uid;
                return (
                  <div key={member.uid} className="flex items-center justify-between p-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.displayName}
                          className="w-7 h-7 rounded-full border border-slate-700"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center">
                          {member.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200">
                            {member.displayName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      {member.role === 'owner' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Owner
                        </span>
                      ) : member.role === 'editor' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          Editor
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          Viewer
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
