import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type {
  GraphFilter,
  HumanWebData,
  MapMemberRole,
  PathResult,
  Person,
  Relationship,
  RelationshipType,
  SharedMap,
  StorageMode,
  UserProfile,
} from '../types/graph';
import { getDeterministicColor } from '../utils/color';
import {
  createSharedMap,
  deletePersonFromFirestore,
  deleteRelationshipFromFirestore,
  generateMapInvite,
  getUserAccessibleMaps,
  isFirebaseConfigured,
  joinSharedMapWithToken,
  migrateJsonToSharedMap,
  savePersonToFirestore,
  saveRelationshipToFirestore,
  subscribeToAuth,
  subscribeToFirestorePeople,
  subscribeToFirestoreRelationships,
  subscribeToSharedMap,
  updateNodePositionsInFirestore,
} from '../services/firebase';

export function useGraphData() {
  const [people, setPeople] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Storage and Collaboration State
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<SharedMap | null>(null);
  const [userMaps, setUserMaps] = useState<SharedMap[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ mapId: string; token: string } | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  const [discoveryPath, setDiscoveryPath] = useState<PathResult | null>(null);

  const [filter, setFilter] = useState<GraphFilter>({
    searchQuery: '',
    selectedTags: [],
    selectedTypes: [],
  });

  // Keep a ref to local data so we can migrate current local graph even while in local mode
  const localDataRef = useRef<{ people: Person[]; relationships: Relationship[] }>({
    people: [],
    relationships: [],
  });

  // Track subscriptions
  const unsubPeopleRef = useRef<(() => void) | null>(null);
  const unsubRelsRef = useRef<(() => void) | null>(null);
  const unsubMapRef = useRef<(() => void) | null>(null);

  // 1. Initial Auth & URL invite detection on mount
  useEffect(() => {
    // Detect invite in URL: ?join=<mapId>&token=<token>
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const joinMapId = params.get('join');
      const token = params.get('token');
      if (joinMapId && token) {
        setPendingInvite({ mapId: joinMapId, token });
      }
    }

    // Subscribe to Auth state
    const unsubAuth = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user && isFirebaseConfigured()) {
        try {
          const maps = await getUserAccessibleMaps(user);
          setUserMaps(maps);
        } catch (err) {
          console.error('Error fetching accessible user maps:', err);
        }
      } else {
        setUserMaps([]);
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // 2. Refresh accessible user maps
  const refreshUserMaps = useCallback(async () => {
    if (!currentUser || !isFirebaseConfigured()) return;
    try {
      const maps = await getUserAccessibleMaps(currentUser);
      setUserMaps(maps);
    } catch (err) {
      console.error('Error refreshing maps:', err);
    }
  }, [currentUser]);

  // 3. Process Pending Invite when User is authenticated
  useEffect(() => {
    if (!pendingInvite || !currentUser || !isFirebaseConfigured()) return;

    let isCancelled = false;
    async function processJoin() {
      try {
        setIsLoading(true);
        const map = await joinSharedMapWithToken(
          pendingInvite!.mapId,
          pendingInvite!.token,
          currentUser!
        );
        if (!isCancelled) {
          setActiveMapId(map.id);
          setActiveMap(map);
          setStorageMode('cloud');
          setPendingInvite(null);

          // Clean up URL query params
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          await refreshUserMaps();
        }
      } catch (err) {
        console.error('Failed to join map via invite:', err);
        alert(err instanceof Error ? err.message : 'Failed to join shared graph.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    processJoin();
    return () => {
      isCancelled = true;
    };
  }, [pendingInvite, currentUser, refreshUserMaps]);

  // 4. Data Loading / Subscription management based on storageMode & activeMapId
  useEffect(() => {
    // Cleanup prior Firestore subscriptions
    if (unsubPeopleRef.current) {
      unsubPeopleRef.current();
      unsubPeopleRef.current = null;
    }
    if (unsubRelsRef.current) {
      unsubRelsRef.current();
      unsubRelsRef.current = null;
    }
    if (unsubMapRef.current) {
      unsubMapRef.current();
      unsubMapRef.current = null;
    }

    if (storageMode === 'local') {
      let isMounted = true;
      async function loadLocal() {
        try {
          setIsLoading(true);
          const data = await initializeDatabase();
          if (isMounted) {
            setPeople(data.people);
            setRelationships(data.relationships);
            localDataRef.current = {
              people: data.people,
              relationships: data.relationships,
            };
          }
        } catch (err) {
          console.error('Failed to initialize IndexedDB:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
      loadLocal();
      return () => {
        isMounted = false;
      };
    }

    // CLOUD MODE
    if (storageMode === 'cloud' && activeMapId && isFirebaseConfigured()) {
      setIsLoading(true);

      unsubMapRef.current = subscribeToSharedMap(
        activeMapId,
        (mapData) => {
          setActiveMap(mapData);
        },
        (err) => console.error('Map metadata error:', err)
      );

      unsubPeopleRef.current = subscribeToFirestorePeople(
        activeMapId,
        (cloudPeople) => {
          setPeople(cloudPeople);
          setIsLoading(false);
        },
        (err) => console.error('Firestore people sync error:', err)
      );

      unsubRelsRef.current = subscribeToFirestoreRelationships(
        activeMapId,
        (cloudRels) => {
          setRelationships(cloudRels);
          setIsLoading(false);
        },
        (err) => console.error('Firestore relationships sync error:', err)
      );

      return () => {
        if (unsubPeopleRef.current) unsubPeopleRef.current();
        if (unsubRelsRef.current) unsubRelsRef.current();
        if (unsubMapRef.current) unsubMapRef.current();
      };
    }
  }, [storageMode, activeMapId]);

  // Keep local data reference updated when in local mode
  useEffect(() => {
    if (storageMode === 'local') {
      localDataRef.current = { people, relationships };
    }
  }, [storageMode, people, relationships]);

  // Selected person object
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // People map for fast lookup
  const peopleMap = useMemo(() => {
    return new Map<string, Person>(people.map((p) => [p.id, p]));
  }, [people]);

  // Permissions: Can current user edit the active graph?
  const canEdit = useMemo(() => {
    if (storageMode === 'local') return true;
    if (!activeMap || !currentUser) return false;
    const member = activeMap.members[currentUser.uid];
    if (!member) return false;
    return member.role === 'owner' || member.role === 'editor';
  }, [storageMode, activeMap, currentUser]);

  // Switch to Local Map
  const switchToLocal = useCallback(async () => {
    setStorageMode('local');
    setActiveMapId(null);
    setActiveMap(null);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
  }, []);

  // Switch to an existing Cloud Map
  const switchToCloudMap = useCallback(async (mapId: string) => {
    setActiveMapId(mapId);
    setStorageMode('cloud');
    setSelectedPersonId(null);
    setDiscoveryPath(null);
  }, []);

  // Create a brand new Cloud Map
  const createNewCloudMap = useCallback(
    async (title: string, description: string) => {
      if (!currentUser) throw new Error('You must be signed in to create a shared cloud map.');
      const mapId = await createSharedMap(title, description, currentUser);
      await refreshUserMaps();
      await switchToCloudMap(mapId);
      return mapId;
    },
    [currentUser, refreshUserMaps, switchToCloudMap]
  );

  // Migrate local data or uploaded JSON to Firestore
  const migrateCurrentDataToCloud = useCallback(
    async (title: string, dataToMigrate: HumanWebData) => {
      if (!currentUser) throw new Error('You must be signed in to migrate data to a shared cloud map.');
      const result = await migrateJsonToSharedMap(title, dataToMigrate, currentUser);
      await refreshUserMaps();
      await switchToCloudMap(result.mapId);
      return result;
    },
    [currentUser, refreshUserMaps, switchToCloudMap]
  );

  // Generate invite link token
  const generateInvite = useCallback(
    async (role: MapMemberRole = 'editor') => {
      if (!activeMapId || !currentUser) throw new Error('Cannot generate invite for inactive map.');
      return await generateMapInvite(activeMapId, currentUser, role);
    },
    [activeMapId, currentUser]
  );

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
        createdRels.push(rel);
      }

      if (storageMode === 'cloud' && activeMapId) {
        await savePersonToFirestore(activeMapId, newPerson);
        for (const rel of createdRels) {
          await saveRelationshipToFirestore(activeMapId, rel);
        }
      } else {
        await dbSavePerson(newPerson);
        for (const rel of createdRels) {
          await dbSaveRelationship(rel);
        }
        setPeople((prev) => [...prev, newPerson]);
        if (createdRels.length > 0) {
          setRelationships((prev) => [...prev, ...createdRels]);
        }
      }

      setSelectedPersonId(id);
      return newPerson;
    },
    [storageMode, activeMapId]
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

      if (storageMode === 'cloud' && activeMapId) {
        await savePersonToFirestore(activeMapId, updated);
      } else {
        await dbSavePerson(updated);
        setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    },
    [people, storageMode, activeMapId]
  );

  // Remove person
  const removePerson = useCallback(
    async (id: string) => {
      if (storageMode === 'cloud' && activeMapId) {
        await deletePersonFromFirestore(activeMapId, id);
      } else {
        await dbDeletePerson(id);
        setPeople((prev) => prev.filter((p) => p.id !== id));
        setRelationships((prev) => {
          return prev.filter((r) => {
            const s = typeof r.source === 'object' ? (r.source as any).id : r.source;
            const t = typeof r.target === 'object' ? (r.target as any).id : r.target;
            return s !== id && t !== id;
          });
        });
      }

      if (selectedPersonId === id) {
        setSelectedPersonId(null);
      }
      if (discoveryPath?.nodeIds.includes(id)) {
        setDiscoveryPath(null);
      }
    },
    [storageMode, activeMapId, selectedPersonId, discoveryPath]
  );

  // Add single relationship
  const addRelationship = useCallback(
    async (data: Omit<Relationship, 'id' | 'createdAt'>) => {
      const now = Date.now();
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `r-${now}-${Math.random().toString(36).slice(2, 7)}`;

      const newRel: Relationship = {
        ...data,
        id,
        createdAt: now,
      };

      if (storageMode === 'cloud' && activeMapId) {
        await saveRelationshipToFirestore(activeMapId, newRel);
      } else {
        await dbSaveRelationship(newRel);
        setRelationships((prev) => [...prev, newRel]);
      }
      return newRel;
    },
    [storageMode, activeMapId]
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
        newRels.push(newRel);
      }

      if (storageMode === 'cloud' && activeMapId) {
        for (const rel of newRels) {
          await saveRelationshipToFirestore(activeMapId, rel);
        }
      } else {
        for (const rel of newRels) {
          await dbSaveRelationship(rel);
        }
        if (newRels.length > 0) {
          setRelationships((prev) => [...prev, ...newRels]);
        }
      }

      return newRels;
    },
    [relationships, storageMode, activeMapId]
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

      if (storageMode === 'cloud' && activeMapId) {
        await saveRelationshipToFirestore(activeMapId, updated);
      } else {
        await dbSaveRelationship(updated);
        setRelationships((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    },
    [relationships, storageMode, activeMapId]
  );

  // Remove relationship
  const removeRelationship = useCallback(
    async (id: string) => {
      if (storageMode === 'cloud' && activeMapId) {
        await deleteRelationshipFromFirestore(activeMapId, id);
      } else {
        await dbDeleteRelationship(id);
        setRelationships((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [storageMode, activeMapId]
  );

  // Update node positions (drag end)
  const saveNodePositions = useCallback(
    async (positions: Array<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>) => {
      // Optimistically update local react state so canvas feels instant
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

      if (storageMode === 'cloud' && activeMapId) {
        await updateNodePositionsInFirestore(activeMapId, positions);
      } else {
        await dbUpdateNodePositions(positions);
      }
    },
    [storageMode, activeMapId]
  );

  // Reset to sample network (local only)
  const resetNetwork = useCallback(async () => {
    setIsLoading(true);
    const data = await resetToSampleNetwork();
    setPeople(data.people);
    setRelationships(data.relationships);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
    setIsLoading(false);
  }, []);

  // Clear all data (local only)
  const clearNetwork = useCallback(async () => {
    await clearAllDatabaseData();
    setPeople([]);
    setRelationships([]);
    setSelectedPersonId(null);
    setDiscoveryPath(null);
  }, []);

  // Import JSON data (local mode)
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
    storageMode,
    activeMapId,
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
    switchToLocal,
    switchToCloudMap,
    createNewCloudMap,
    migrateCurrentDataToCloud,
    generateInvite,
    refreshUserMaps,
    localData: localDataRef.current,
  };
}
