import {
  RELATIONSHIP_LABELS,
  type PathResult,
  type PathStep,
  type Person,
  type Relationship,
} from '../types/graph';

export function findShortestPath(
  sourceId: string,
  targetId: string,
  people: Person[],
  relationships: Relationship[]
): PathResult {
  const peopleMap = new Map<string, Person>(people.map((p) => [p.id, p]));
  const relMap = new Map<string, Relationship>(relationships.map((r) => [r.id, r]));

  const sourcePerson = peopleMap.get(sourceId);
  const targetPerson = peopleMap.get(targetId);

  if (!sourcePerson || !targetPerson) {
    return {
      found: false,
      pathLength: 0,
      degrees: 0,
      nodeIds: [],
      linkIds: [],
      nodes: [],
      links: [],
      steps: [],
      explanation: 'One or both individuals could not be found.',
    };
  }

  if (sourceId === targetId) {
    return {
      found: true,
      pathLength: 0,
      degrees: 0,
      nodeIds: [sourceId],
      linkIds: [],
      nodes: [sourcePerson],
      links: [],
      steps: [],
      explanation: `${sourcePerson.name} is the same person (0 degrees of separation).`,
    };
  }

  // Build adjacency list: node -> array of { neighborId, relationshipId }
  const adj = new Map<string, Array<{ neighborId: string; relationshipId: string }>>();
  for (const person of people) {
    adj.set(person.id, []);
  }

  for (const rel of relationships) {
    const s = typeof rel.source === 'object' ? (rel.source as any).id : rel.source;
    const t = typeof rel.target === 'object' ? (rel.target as any).id : rel.target;

    if (!adj.has(s)) adj.set(s, []);
    if (!adj.has(t)) adj.set(t, []);

    adj.get(s)!.push({ neighborId: t, relationshipId: rel.id });
    adj.get(t)!.push({ neighborId: s, relationshipId: rel.id });
  }

  // BFS to find the shortest hop path
  interface QueueItem {
    personId: string;
    path: string[];
    relPath: string[];
  }

  const queue: QueueItem[] = [{ personId: sourceId, path: [sourceId], relPath: [] }];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const { personId, path, relPath } = queue.shift()!;

    if (personId === targetId) {
      // Path found!
      const pathNodes: Person[] = path.map((id) => peopleMap.get(id)!).filter(Boolean);
      const pathLinks: Relationship[] = relPath.map((id) => relMap.get(id)!).filter(Boolean);

      const steps: PathStep[] = [];
      for (let i = 0; i < pathLinks.length; i++) {
        steps.push({
          from: pathNodes[i],
          relationship: pathLinks[i],
          to: pathNodes[i + 1],
        });
      }

      const degrees = pathLinks.length;
      let explanation = '';
      if (degrees === 1) {
        const relType =
          steps[0].relationship.type === 'custom' && steps[0].relationship.customType
            ? steps[0].relationship.customType
            : RELATIONSHIP_LABELS[steps[0].relationship.type] || 'Connected';
        explanation = `${sourcePerson.name} and ${targetPerson.name} are directly connected as ${relType.toLowerCase()}s (1st degree).`;
      } else {
        const mutualCount = degrees - 1;
        explanation = `${sourcePerson.name} connects to ${targetPerson.name} through ${mutualCount} mutual ${
          mutualCount === 1 ? 'acquaintance' : 'acquaintances'
        } (${degrees} degrees of separation).`;
      }

      return {
        found: true,
        pathLength: degrees,
        degrees,
        nodeIds: path,
        linkIds: relPath,
        nodes: pathNodes,
        links: pathLinks,
        steps,
        explanation,
      };
    }

    const neighbors = adj.get(personId) || [];
    for (const { neighborId, relationshipId } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({
          personId: neighborId,
          path: [...path, neighborId],
          relPath: [...relPath, relationshipId],
        });
      }
    }
  }

  return {
    found: false,
    pathLength: 0,
    degrees: 0,
    nodeIds: [],
    linkIds: [],
    nodes: [],
    links: [],
    steps: [],
    explanation: `No connection recorded between ${sourcePerson.name} and ${targetPerson.name} in the current web. These individuals inhabit separate social orbits.`,
  };
}

export function getDirectConnections(
  personId: string,
  people: Person[],
  relationships: Relationship[]
): Array<{ person: Person; relationship: Relationship; isOrigin: boolean }> {
  const peopleMap = new Map<string, Person>(people.map((p) => [p.id, p]));
  const results: Array<{ person: Person; relationship: Relationship; isOrigin: boolean }> = [];

  for (const rel of relationships) {
    const s = typeof rel.source === 'object' ? (rel.source as any).id : rel.source;
    const t = typeof rel.target === 'object' ? (rel.target as any).id : rel.target;

    if (s === personId) {
      const neighbor = peopleMap.get(t);
      if (neighbor) {
        results.push({ person: neighbor, relationship: rel, isOrigin: true });
      }
    } else if (t === personId) {
      const neighbor = peopleMap.get(s);
      if (neighbor) {
        results.push({ person: neighbor, relationship: rel, isOrigin: false });
      }
    }
  }

  return results;
}

export function getAllTags(people: Person[]): string[] {
  const tagSet = new Set<string>();
  for (const p of people) {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach((t) => tagSet.add(t.trim()));
    }
  }
  return Array.from(tagSet).sort();
}
