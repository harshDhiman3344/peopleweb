import type { HumanWebData, Person, Relationship } from '../types/graph';

export function exportToJsonFile(people: Person[], relationships: Relationship[], filename?: string): void {
  const data: HumanWebData = {
    version: 1,
    exportDate: new Date().toISOString(),
    people,
    relationships,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const name = filename || `human-web-${new Date().toISOString().slice(0, 10)}.json`;
  downloadAnchor.setAttribute('download', name);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: HumanWebData;
}

export function validateImportJson(rawText: string): ValidationResult {
  try {
    const parsed = JSON.parse(rawText);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'File is not a valid JSON object.' };
    }

    if (!Array.isArray(parsed.people)) {
      return { isValid: false, error: 'Missing or invalid "people" array in JSON.' };
    }

    if (!Array.isArray(parsed.relationships)) {
      return { isValid: false, error: 'Missing or invalid "relationships" array in JSON.' };
    }

    // Validate people items
    for (const p of parsed.people) {
      if (!p.id || typeof p.id !== 'string') {
        return { isValid: false, error: 'Each person must have a valid string "id".' };
      }
      if (!p.name || typeof p.name !== 'string') {
        return { isValid: false, error: `Person with ID "${p.id}" is missing a valid "name".` };
      }
      if (!Array.isArray(p.tags)) {
        p.tags = [];
      }
    }

    // Validate relationship items
    for (const r of parsed.relationships) {
      if (!r.id || !r.source || !r.target) {
        return { isValid: false, error: 'Each relationship must have an "id", "source", and "target".' };
      }
    }

    return {
      isValid: true,
      data: {
        version: parsed.version || 1,
        exportDate: parsed.exportDate || new Date().toISOString(),
        people: parsed.people,
        relationships: parsed.relationships,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON parsing failed: ${err.message || 'Syntax error'}`,
    };
  }
}
