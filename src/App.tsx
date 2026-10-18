import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import { useGraphData } from './hooks/useGraphData';
import { useWindowSize } from './hooks/useWindowSize';
import { GraphCanvas } from './components/Canvas/GraphCanvas';
import { GraphControls } from './components/Canvas/GraphControls';
import { Legend } from './components/Canvas/Legend';
import { PersonDetailPanel } from './components/Panels/PersonDetailPanel';
import { PathBanner } from './components/Panels/PathBanner';
import { HeaderToolbar } from './components/Navigation/HeaderToolbar';
import { TagFilterBar } from './components/Navigation/TagFilterBar';
import { PersonModal } from './components/Modals/PersonModal';
import { RelationshipModal } from './components/Modals/RelationshipModal';
import { ConnectionDiscoveryModal } from './components/Modals/ConnectionDiscoveryModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { AuthModal } from './components/Modals/AuthModal';
import { ShareMapModal } from './components/Modals/ShareMapModal';
import { CloudMapsModal } from './components/Modals/CloudMapsModal';
import { getAllTags } from './algorithms/pathFinder';
import type { Person, Relationship } from './types/graph';
import { Sparkles, Users, ArrowRight, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logoutUser } from './services/firebase';

export function App() {
  const { width, height } = useWindowSize();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  const {
    people,
    relationships,
    isLoading,
    storageMode,
    activeMap,
    userMaps,
    currentUser,
    canEdit,
    pendingInvite,
    setPendingInvite,
    selectedPersonId,
    selectedPerson,
    setSelectedPersonId,
    hoveredPersonId,
    setHoveredPersonId,
    setHoveredLinkId,
    discoveryPath,
    discoverPath,
    clearDiscoveryPath,
    filter,
    setSearchQuery,
    toggleTagFilter,
    clearFilters,
    addPerson,
    updatePerson,
    removePerson,
    addRelationships,
    updateRelationship,
    removeRelationship,
    saveNodePositions,
    resetNetwork,
    clearNetwork,
    importData,
    switchToLocal,
    switchToCloudMap,
    createNewCloudMap,
    migrateCurrentDataToCloud,
    generateInvite,
    localData,
  } = useGraphData();

  // Modal states
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [initialConnectPerson, setInitialConnectPerson] = useState<Person | null>(null);

  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  const [relInitialSourceId, setRelInitialSourceId] = useState<string | undefined>(undefined);
  const [relInitialTargetId, setRelInitialTargetId] = useState<string | undefined>(undefined);

  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveryInitialSourceId, setDiscoveryInitialSourceId] = useState<string | undefined>(undefined);

  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCloudMapsModalOpen, setIsCloudMapsModalOpen] = useState(false);

  // All distinct tags across people
  const allTags = useMemo(() => getAllTags(people), [people]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPersonModalOpen) setIsPersonModalOpen(false);
        else if (isRelationshipModalOpen) setIsRelationshipModalOpen(false);
        else if (isDiscoveryModalOpen) setIsDiscoveryModalOpen(false);
        else if (isImportExportModalOpen) setIsImportExportModalOpen(false);
        else if (isAuthModalOpen) setIsAuthModalOpen(false);
        else if (isShareModalOpen) setIsShareModalOpen(false);
        else if (isCloudMapsModalOpen) setIsCloudMapsModalOpen(false);
        else if (discoveryPath) clearDiscoveryPath();
        else if (selectedPersonId) setSelectedPersonId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPersonModalOpen,
    isRelationshipModalOpen,
    isDiscoveryModalOpen,
    isImportExportModalOpen,
    isAuthModalOpen,
    isShareModalOpen,
    isCloudMapsModalOpen,
    discoveryPath,
    selectedPersonId,
    clearDiscoveryPath,
    setSelectedPersonId,
  ]);

  // Modal openers
  const handleOpenAddPerson = useCallback(() => {
    setEditingPerson(null);
    setInitialConnectPerson(null);
    setIsPersonModalOpen(true);
  }, []);

  const handleEditPerson = useCallback((person: Person) => {
    setEditingPerson(person);
    setInitialConnectPerson(null);
    setIsPersonModalOpen(true);
  }, []);

  const handleAddConnectionFromPerson = useCallback((person: Person) => {
    setRelInitialSourceId(person.id);
    setRelInitialTargetId(undefined);
    setEditingRelationship(null);
    setIsRelationshipModalOpen(true);
  }, []);

  const handleDiscoverFromPerson = useCallback((person: Person) => {
    setDiscoveryInitialSourceId(person.id);
    setIsDiscoveryModalOpen(true);
  }, []);

  const handleOpenAddRelationship = useCallback(() => {
    setEditingRelationship(null);
    setRelInitialSourceId(selectedPersonId || undefined);
    setRelInitialTargetId(undefined);
    setIsRelationshipModalOpen(true);
  }, [selectedPersonId]);

  const handleUnpinAll = useCallback(() => {
    const unpinned = people.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      fx: null,
      fy: null,
    }));
    saveNodePositions(unpinned);
    graphRef.current?.d3ReheatSimulation();
  }, [people, saveNodePositions]);

  const handleFocusPath = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(500, 80);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await logoutUser();
    await switchToLocal();
  }, [switchToLocal]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#080c16] text-slate-200">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-sky-500/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-2 border-t-sky-400 border-r-transparent border-b-indigo-400 border-l-transparent animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-300 tracking-wide">
          Igniting Constellation Web...
        </p>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080c16] text-slate-100 select-none">
      {/* Top Floating Navigation Bar */}
      <HeaderToolbar
        searchQuery={filter.searchQuery}
        onSearchChange={setSearchQuery}
        peopleCount={people.length}
        relationshipCount={relationships.length}
        onOpenAddPerson={handleOpenAddPerson}
        onOpenAddRelationship={handleOpenAddRelationship}
        onOpenDiscovery={() => {
          setDiscoveryInitialSourceId(selectedPersonId || undefined);
          setIsDiscoveryModalOpen(true);
        }}
        onOpenImportExport={() => setIsImportExportModalOpen(true)}
        allPeople={people}
        onSelectPerson={(id) => setSelectedPersonId(id)}
        storageMode={storageMode}
        activeMap={activeMap}
        currentUser={currentUser}
        canEdit={canEdit}
        onOpenMapsModal={() => setIsCloudMapsModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Circle/Tag Filter Chips */}
      <TagFilterBar
        allTags={allTags}
        selectedTags={filter.selectedTags}
        onToggleTag={toggleTagFilter}
        onClearTags={clearFilters}
      />

      {/* Main Force Graph Canvas */}
      <ErrorBoundary>
        <GraphCanvas
          width={width}
          height={height}
          people={people}
          relationships={relationships}
          selectedPersonId={selectedPersonId}
          hoveredPersonId={hoveredPersonId}
          discoveryPath={discoveryPath}
          searchQuery={filter.searchQuery}
          selectedTags={filter.selectedTags}
          onSelectPerson={setSelectedPersonId}
          onHoverPerson={setHoveredPersonId}
          onHoverLink={setHoveredLinkId}
          onNodePositionsChange={saveNodePositions}
          graphRef={graphRef}
        />
      </ErrorBoundary>

      {/* Bottom Left: Graph Legend */}
      <div className="fixed bottom-6 left-6 z-20 hidden sm:block">
        <Legend />
      </div>

      {/* Floating Graph Controls (Zoom, Fit, Reheat, Fullscreen) */}
      <div className="fixed bottom-6 right-6 z-20">
        <GraphControls graphRef={graphRef} onUnpinAll={handleUnpinAll} />
      </div>

      {/* Shortest Path Degrees of Separation Floating Banner */}
      <PathBanner
        pathResult={discoveryPath}
        onClear={clearDiscoveryPath}
        onSelectPerson={(id) => setSelectedPersonId(id)}
        onFocusPath={handleFocusPath}
      />

      {/* Side Detail Panel for Selected Person */}
      <PersonDetailPanel
        person={selectedPerson}
        allPeople={people}
        allRelationships={relationships}
        onClose={() => setSelectedPersonId(null)}
        onEditPerson={handleEditPerson}
        onDeletePerson={removePerson}
        onSelectPerson={(id) => setSelectedPersonId(id)}
        onAddConnectionFromPerson={handleAddConnectionFromPerson}
        onAddNewPersonConnectedTo={(person) => {
          setEditingPerson(null);
          setInitialConnectPerson(person);
          setIsPersonModalOpen(true);
        }}
        onDiscoverFromPerson={handleDiscoverFromPerson}
        onDeleteRelationship={removeRelationship}
        canEdit={canEdit}
      />

      {/* Person Modal (Create & Edit) */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        onSave={async (personData, connectToIds, connDetails) => {
          if (editingPerson) {
            await updatePerson(editingPerson.id, personData);
          } else {
            await addPerson(personData, connectToIds, connDetails);
          }
        }}
        editingPerson={editingPerson}
        initialConnectPerson={initialConnectPerson}
        existingTags={allTags}
        allPeople={people}
      />

      {/* Relationship Modal (Create & Edit) */}
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => setIsRelationshipModalOpen(false)}
        onSave={async (sourceId, targetIds, relData) => {
          if (editingRelationship) {
            await updateRelationship(editingRelationship.id, {
              source: sourceId,
              target: targetIds[0],
              ...relData,
            });
          } else {
            await addRelationships(sourceId, targetIds, relData);
          }
        }}
        onDelete={removeRelationship}
        editingRelationship={editingRelationship}
        initialSourceId={relInitialSourceId}
        initialTargetId={relInitialTargetId}
        allPeople={people}
        allRelationships={relationships}
      />

      {/* Six Degrees Shortest Path Discovery Modal */}
      <ConnectionDiscoveryModal
        isOpen={isDiscoveryModalOpen}
        onClose={() => setIsDiscoveryModalOpen(false)}
        allPeople={people}
        initialSourceId={discoveryInitialSourceId}
        onDiscover={(sourceId, targetId) => discoverPath(sourceId, targetId)}
      />

      {/* Backup & Data Modal (JSON Export/Import & Reset) */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        people={people}
        relationships={relationships}
        onImport={importData}
        onResetNetwork={resetNetwork}
        onClearNetwork={clearNetwork}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />

      {/* Share Graph Modal (Generate & Copy Invites) */}
      <ShareMapModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activeMap={activeMap}
        currentUser={currentUser}
        onGenerateInvite={generateInvite}
      />

      {/* Maps & Cloud Sync Modal */}
      <CloudMapsModal
        isOpen={isCloudMapsModalOpen}
        onClose={() => setIsCloudMapsModalOpen(false)}
        storageMode={storageMode}
        activeMap={activeMap}
        userMaps={userMaps}
        currentUser={currentUser}
        currentLocalData={{
          version: 1,
          exportDate: new Date().toISOString(),
          people: localData.people,
          relationships: localData.relationships,
        }}
        onSwitchToLocal={switchToLocal}
        onSwitchToCloudMap={switchToCloudMap}
        onCreateCloudMap={createNewCloudMap}
        onMigrateToCloud={migrateCurrentDataToCloud}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
      />

      {/* Pending Invite Notification Pill */}
      {pendingInvite && !currentUser && (
        <div className="fixed top-20 inset-x-4 max-w-lg mx-auto z-40 p-4 bg-[#0d1322]/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">You're invited to a shared web!</p>
              <p className="text-[11px] text-slate-400">Sign in or join as guest to collaborate on this graph.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPendingInvite(null)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty State Banner if user wiped all data */}
      {people.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="max-w-md p-6 bg-[#0d1322]/90 backdrop-blur-xl border border-slate-800 rounded-3xl text-center shadow-2xl pointer-events-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Your Web is Empty</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Begin by adding your first acquaintance or restore the collegiate demo map!
            </p>
            <div className="flex gap-2 justify-center">
              {canEdit && (
                <button
                  onClick={handleOpenAddPerson}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  Add First Person
                </button>
              )}
              {storageMode === 'local' && (
                <button
                  onClick={resetNetwork}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                >
                  Load Sample Network
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
