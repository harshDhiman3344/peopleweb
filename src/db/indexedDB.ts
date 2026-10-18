import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { HumanWebData, Person, Relationship } from '../types/graph';
import { SAMPLE_PEOPLE, SAMPLE_RELATIONSHIPS } from './sampleData';

const DB_NAME = 'human_web_db';
const DB_VERSION = 1;

interface HumanWebDBSchema extends DBSchema {
  people: {
    key: string;
    value: Person;
  };
  relationships: {
    key: string;
    value: Relationship;
    indexes: {
      'by-source': string;
      'by-target': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<HumanWebDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<HumanWebDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<HumanWebDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('people')) {
          db.createObjectStore('people', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('by-source', 'source');
          relStore.createIndex('by-target', 'target');
        }
      },
    });
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<{
  people: Person[];
  relationships: Relationship[];
}> {
  const db = await getDB();
  const count = await db.count('people');

  if (count === 0) {
    // Seed with realistic sample network
    const tx = db.transaction(['people', 'relationships'], 'readwrite');
    for (const p of SAMPLE_PEOPLE) {
      await tx.objectStore('people').put(p);
    }
    for (const r of SAMPLE_RELATIONSHIPS) {
      await tx.objectStore('relationships').put(r);
    }
    await tx.done;
    return {
      people: SAMPLE_PEOPLE,
      relationships: SAMPLE_RELATIONSHIPS,
    };
  }

  const people = await db.getAll('people');
  const relationships = await db.getAll('relationships');
  return { people, relationships };
}

export async function getAllPeople(): Promise<Person[]> {
  const db = await getDB();
  return db.getAll('people');
}

export async function savePerson(person: Person): Promise<void> {
  const db = await getDB();
  await db.put('people', person);
}

export async function savePeople(people: Person[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('people', 'readwrite');
  for (const person of people) {
    await tx.store.put(person);
  }
  await tx.done;
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['people', 'relationships'], 'readwrite');

  // Delete person
  await tx.objectStore('people').delete(id);

  // Delete all connecting relationships
  const allRels = await tx.objectStore('relationships').getAll();
  for (const rel of allRels) {
    if (rel.source === id || rel.target === id) {
      await tx.objectStore('relationships').delete(rel.id);
    }
  }

  await tx.done;
}

export async function getAllRelationships(): Promise<Relationship[]> {
  const db = await getDB();
  return db.getAll('relationships');
}

export async function saveRelationship(relationship: Relationship): Promise<void> {
  const db = await getDB();
  await db.put('relationships', relationship);
}

export async function deleteRelationship(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('relationships', id);
}

export async function updateNodePositions(
  positions: Array<{ id: string; x?: number; y?: number; fx?: number | null; fy?: number | null }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('people', 'readwrite');
  for (const pos of positions) {
    const existing = await tx.store.get(pos.id);
    if (existing) {
      existing.x = pos.x;
      existing.y = pos.y;
      existing.fx = pos.fx;
      existing.fy = pos.fy;
      await tx.store.put(existing);
    }
  }
  await tx.done;
}

export async function resetToSampleNetwork(): Promise<{
  people: Person[];
  relationships: Relationship[];
}> {
  const db = await getDB();
  const tx = db.transaction(['people', 'relationships'], 'readwrite');
  await tx.objectStore('people').clear();
  await tx.objectStore('relationships').clear();

  for (const p of SAMPLE_PEOPLE) {
    await tx.objectStore('people').put(p);
  }
  for (const r of SAMPLE_RELATIONSHIPS) {
    await tx.objectStore('relationships').put(r);
  }
  await tx.done;

  return {
    people: SAMPLE_PEOPLE,
    relationships: SAMPLE_RELATIONSHIPS,
  };
}

export async function clearAllDatabaseData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['people', 'relationships'], 'readwrite');
  await tx.objectStore('people').clear();
  await tx.objectStore('relationships').clear();
  await tx.done;
}

export async function exportDatabaseData(): Promise<HumanWebData> {
  const db = await getDB();
  const people = await db.getAll('people');
  const relationships = await db.getAll('relationships');
  return {
    version: 1,
    exportDate: new Date().toISOString(),
    people,
    relationships,
  };
}

export async function importDatabaseData(
  data: HumanWebData,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ people: Person[]; relationships: Relationship[] }> {
  const db = await getDB();
  const tx = db.transaction(['people', 'relationships'], 'readwrite');

  if (mode === 'replace') {
    await tx.objectStore('people').clear();
    await tx.objectStore('relationships').clear();
  }

  for (const p of data.people) {
    await tx.objectStore('people').put(p);
  }
  for (const r of data.relationships) {
    await tx.objectStore('relationships').put(r);
  }
  await tx.done;

  const people = await db.getAll('people');
  const relationships = await db.getAll('relationships');
  return { people, relationships };
}
