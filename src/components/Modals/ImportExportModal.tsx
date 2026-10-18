import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileJson,
} from 'lucide-react';
import { exportToJsonFile, validateImportJson } from '../../utils/exportImport';
import type { HumanWebData, Person, Relationship } from '../../types/graph';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  onImport: (data: HumanWebData, mode: 'replace' | 'merge') => Promise<void>;
  onResetNetwork: () => Promise<void>;
  onClearNetwork: () => Promise<void>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  people,
  relationships,
  onImport,
  onResetNetwork,
  onClearNetwork,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
    data?: HumanWebData;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    exportToJsonFile(people, relationships);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const validation = validateImportJson(text);

      if (!validation.isValid || !validation.data) {
        setImportStatus({
          success: false,
          message: validation.error || 'Invalid file format.',
        });
      } else {
        setImportStatus({
          success: true,
          message: `Ready to import ${validation.data.people.length} people and ${validation.data.relationships.length} relationships.`,
          data: validation.data,
        });
      }
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Failed to read file: ${err.message}`,
      });
    }
  };

  const handleApplyImport = async (mode: 'replace' | 'merge') => {
    if (!importStatus?.data) return;
    setIsProcessing(true);
    try {
      await onImport(importStatus.data, mode);
      onClose();
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Import failed: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSample = async () => {
    if (
      window.confirm(
        'Reset the network to the default 14-person collegiate sample graph? Any unsaved changes will be replaced.'
      )
    ) {
      setIsProcessing(true);
      try {
        await onResetNetwork();
        onClose();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to completely erase the entire graph? This action cannot be undone unless you have an exported JSON backup.'
      )
    ) {
      setIsProcessing(true);
      try {
        await onClearNetwork();
        onClose();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <FileJson className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              Manage & Backup Network
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Export Section */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Export Backup</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Download your network map ({people.length} people, {relationships.length}{' '}
                connections) as a portable JSON file.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>

          {/* Import Section */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Import Network</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Load a previously saved JSON map file from your computer.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-600 hover:border-sky-400 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition-all"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Choose JSON file to upload</span>
            </button>

            {importStatus && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  importStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {importStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{importStatus.message}</span>
                </div>

                {importStatus.success && importStatus.data && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApplyImport('replace')}
                      disabled={isProcessing}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors"
                    >
                      Replace Existing Web
                    </button>
                    <button
                      onClick={() => handleApplyImport('merge')}
                      disabled={isProcessing}
                      className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Merge with Existing
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset / Sample Network */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleResetSample}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Reset to Sample Network</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={isProcessing}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
