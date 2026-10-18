export type RelationshipType =
  | 'friend'
  | 'close_friend'
  | 'classmate'
  | 'colleague'
  | 'society'
  | 'roommate'
  | 'family'
  | 'mentor'
  | 'acquaintance'
  | 'custom';

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  tags: string[];
  notes?: string;
  avatarColor?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  source: string; // Person id
  target: string; // Person id
  type: RelationshipType;
  customType?: string;
  closeness?: number; // 1 to 5
  notes?: string;
  since?: string;
  createdAt: number;
}

export interface PathStep {
  from: Person;
  relationship: Relationship;
  to: Person;
}

export interface PathResult {
  found: boolean;
  pathLength: number; // number of edges
  degrees: number; // degrees of separation
  nodeIds: string[];
  linkIds: string[];
  nodes: Person[];
  links: Relationship[];
  steps: PathStep[];
  explanation?: string;
}

export interface GraphFilter {
  searchQuery: string;
  selectedTags: string[];
  selectedTypes: RelationshipType[];
}

export interface HumanWebData {
  version: number;
  exportDate: string;
  people: Person[];
  relationships: Relationship[];
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  friend: 'Friend',
  close_friend: 'Close Friend',
  classmate: 'Classmate',
  colleague: 'Colleague',
  society: 'Society / Club Member',
  roommate: 'Roommate',
  family: 'Family',
  mentor: 'Mentor / Mentee',
  acquaintance: 'Acquaintance',
  custom: 'Custom Relation',
};

export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  friend: '#38bdf8', // sky
  close_friend: '#f43f5e', // rose
  classmate: '#a855f7', // purple
  colleague: '#3b82f6', // blue
  society: '#10b981', // emerald
  roommate: '#f59e0b', // amber
  family: '#ec4899', // pink
  mentor: '#06b6d4', // cyan
  acquaintance: '#94a3b8', // slate
  custom: '#8b5cf6', // violet
};
