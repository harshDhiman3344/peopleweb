import { useCallback, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  clearAllDatabaseData,
  deletePerson as dbDeletePerson,
  deleteRelationship as dbDeleteRelationship,
  importDatabaseData,
  initializeDatabase,
  resetToSampleNetwork,
  savePerson as dbSavePerson,
  saveRelationship as dbSaveRelationship,
  updateNodePositions as dbUpdateNodePositions,
} from '../db/indexedDB';
import { findShortestPath } from '../algorithms/pathFinder';
import type { GraphFilter, HumanWebData, PathResult, Person, Relationship, RelationshipType } from '../types/graph';
import { getDeterministicColor } from '../utils/color';

export function useGraphData() {
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  const [discoveryPath, setDiscoveryPath] = useState<PathResult | null>(null);

  const [filter, setFilter] = useState<GraphFilter>({
    searchQuery: '',
    selectedTags: [],
    selectedTypes: [],
  });

  // Load from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        const data = await initializeDatabase();
        if (isMounted) {
          setPeople(data.people);
          setRelationships(data.relationships);
        }
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Selected person object
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // People map for fast lookup
  const peopleMap = useMemo(() => {
    return new Map<string, Person>(people.map((p) => [p.id, p]));
  }, [people]);

  // Add person (supports single or multiple connections)
  const addPerson = useCallback(
    async (
      data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>,
      connectTo?: string | string[],
      connectionDetails?: {
        type: RelationshipType;
        customType?: string;
        closeness?: number;
        since?: string;
        notes?: string;
      }
    ) => {
      const now = Date.now();
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const avatarColor = data.avatarColor || getDeterministicColor(data.name);

      const newPerson: Person = {
        ...data,
        id,
        avatarColor,
        createdAt: now,
        updatedAt: now,
      };

      await dbSavePerson(newPerson);

      const targetIds = Array.isArray(connectTo)
        ? connectTo
        : connectTo
        ? [connectTo]
        : [];

      const createdRels: Relationship[] = [];
      for (const targetId of targetIds) {
        if (!targetId || targetId === id) continue;
        const relId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `r-${now}-${Math.random().toString(36).slice(2, 7)}`;

        const rel: Relationship = {
          id: relId,
          source: targetId,
          target: id,
          type: connectionDetails?.type || 'friend',
          customType: connectionDetails?.customType,
          closeness: connectionDetails?.closeness || 3,
          since: connectionDetails?.since,
          notes: connectionDetails?.notes || '',
          createdAt: now,
        };
        await dbSaveRelationship(rel);
        createdRels.push(rel);
      }

      setPeople((prev) => [...prev, newPerson]);
      if (createdRels.length > 0) {
        setRelationships((prev) => [...prev, ...createdRels]);
      }
      setSelectedPersonId(id);
      return newPerson;
    },
    []
  );

  // Update person
  const updatePerson = useCallback(
    async (id: string, updates: Partial<Person>) => {
      const existing = people.find((p) => p.id === id);
      if (!existing) return;

      const updated: Person = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };

      await dbSavePerson(updated);
      setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [people]
  );

  // Remove person
  const removePerson = useCallback(
    async (id: string) => {
      await dbDeletePerson(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setRelationships((prev) => {
        return prev.filter((r) => {
          const s = typeof r.source === 'object' ? (r.source as any).id : r.source;
          const t = typeof r.target === 'object' ? (r.target as any).id : r.target;
          return s !== id && t !== id;
        });
      });
      if (selectedPersonId === id) {
        setSelectedPersonId(null);
      }
      if (discoveryPath?.nodeIds.includes(id)) {
        setDiscoveryPath(null);
      }
    },
    [selectedPersonId, discoveryPath]
  );

  // Add relationship
  const addRelationship = useCallback(
    async (data: Omit<Relationship, 'id' | 'createdAt'>) => {
      const now = Date.now();
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${now}-${Math.random().toString(36).slice(2, 7)}`;

      const newRel: Relationship = {
        ...data,
        id,
        createdAt: now,
      };

      await dbSaveRelationship(newRel);
      setRelationships((prev) => [...prev, newRel]);
      return newRel;
    },
    []
  );

  // Add multiple relationships at once (bulk/group connect)
  const addRelationships = useCallback(
    async (
      sourceId: string,
      targetIds: string[],
      details: {
        type: RelationshipType;
        customType?: string;
        closeness?: number;
        since?: string;
        notes?: string;
      }
    ) => {
      const now = Date.now();
      const newRels: Relationship[] = [];

      for (const targetId of targetIds) {
        if (!targetId || targetId === sourceId) continue;

        // Skip if already connected between the two
        const alreadyExists = relationships.some((r) => {
          const s = typeof r.source === 'object' ? (r.source as any).id : r.source;
          const t = typeof r.target === 'object' ? (r.target as any).id : r.target;
          return (s === sourceId && t === targetId) || (s === targetId && t === sourceId);
        });
        if (alreadyExists) continue;

        const relId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `r-${now}-${Math.random().toString(36).slice(2, 7)}`;

        const newRel: Relationship = {
          id: relId,
          source: sourceId,
          target: targetId,
          type: details.type,
          customType: details.customType,
          closeness: details.closeness || 3,
          since: details.since,
          notes: details.notes || '',
          createdAt: now,
        };
        await dbSaveRelationship(newRel);
        newRels.push(newRel);
      }

      if (newRels.length > 0) {
        setRelationships((prev) => [...prev, ...newRels]);
      }
      return newRels;
    },
    [relationships]
  );

  // Update relationship
  const updateRelationship = useCallback(
    async (id: string, updates: Partial<Relationship>) => {
      const existing = relationships.find((r) => r.id === id);
      if (!existing) return;

      const updated: Relationship = {
        ...existing,
        ...updates,
      };

      await dbSaveRelationship(updated);
      setRelationships((prev) => prev.map((r) => (r.id === id ? updated : r)));
    },
    [relationships]
  );

  // Remove relationship
  const removeRelationship = useCallback(async (id: string) => {
    await dbDeleteRelationship(id);
    setRelationships((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Update node positions (drag end)
  const saveNodePositions = useCallback(
    async (positions: Array<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>) => {
      await dbUpdateNodePositions(positions);
      setPeople((prev) =>
        prev.map((p) => {
          const match = positions.find((pos) => pos.id === p.id);
          if (match) {
            return {
              ...p,
              x: match.x,
              y: match.y,
              fx: match.fx,
              fy: match.fy,
            };
          }
          return p;
        })
      );
    },
    []
  );

  // Reset to sample network
  const resetNetwork = useCallback(async () => {
    setIsLoading(true);
    const data = await resetToSampleNetwork();
    setPeople(data.people);
    setRelationships(data.relationships);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
    setIsLoading(false);
  }, []);

  // Clear all data
  const clearNetwork = useCallback(async () => {
    await clearAllDatabaseData();
    setPeople([]);
    setRelationships([]);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
  }, []);

  // Import JSON data
  const importData = useCallback(async (data: HumanWebData, mode: 'replace' | 'merge') => {
    setIsLoading(true);
    const res = await importDatabaseData(data, mode);
    setPeople(res.people);
    setRelationships(res.relationships);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
    setIsLoading(false);
  }, []);

  // Find shortest path between two people
  const discoverPath = useCallback(
    (sourceId: string, targetId: string) => {
      const result = findShortestPath(sourceId, targetId, people, relationships);
      setDiscoveryPath(result);

      if (result.found && result.degrees > 0) {
        // Confetti celebration for discovery
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#38bdf8', '#a855f7', '#fbbf24', '#34d399', '#f472b6'],
        });
      }
      return result;
    },
    [people, relationships]
  );

  const clearDiscoveryPath = useCallback(() => {
    setDiscoveryPath(null);
  }, []);

  // Filters
  const setSearchQuery = useCallback((query: string) => {
    setFilter((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleTagFilter = useCallback((tag: string) => {
    setFilter((prev) => {
      const exists = prev.selectedTags.includes(tag);
      return {
        ...prev,
        selectedTags: exists ? prev.selectedTags.filter((t) => t !== tag) : [...prev.selectedTags, tag],
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({
      searchQuery: '',
      selectedTags: [],
      selectedTypes: [],
    });
  }, []);

  return {
    people,
    relationships,
    peopleMap,
    isLoading,
    selectedPersonId,
    selectedPerson,
    setSelectedPersonId,
    hoveredPersonId,
    setHoveredPersonId,
    hoveredLinkId,
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
    addRelationship,
    addRelationships,
    updateRelationship,
    removeRelationship,
    saveNodePositions,
    resetNetwork,
    clearNetwork,
    importData,
  };
}
