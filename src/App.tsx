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
import { getAllTags } from './algorithms/pathFinder';
import type { Person, Relationship } from './types/graph';
import { Sparkles } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const { width, height } = useWindowSize();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  const {
    people,
    relationships,
    isLoading,
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
              <button
                onClick={handleOpenAddPerson}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
              >
                Add First Person
              </button>
              <button
                onClick={resetNetwork}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
              >
                Load Sample Network
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
