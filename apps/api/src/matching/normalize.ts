export interface AnnotationResult {
  cleaned: string;
  isLive: boolean;
  explicit: boolean;
  acoustic: boolean;
}

export function extractAnnotations(input: string): AnnotationResult {
  let isLive = false;
  let explicit = false;
  let acoustic = false;

  const bracketPattern = /\([^)]*?\)|\[[^\]]*?\]/g;
  const brackets: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = bracketPattern.exec(input)) !== null) {
    brackets.push(match[0]);
  }

  for (const bracket of brackets) {
    const lower = bracket.toLowerCase();
    if (/\blive\b/.test(lower)) isLive = true;
    if (/\bexplicit\b/.test(lower)) explicit = true;
    if (/\bacoustic\b/.test(lower)) acoustic = true;
  }

  const cleaned = input.replace(bracketPattern, '').trim();

  return { cleaned, isLive, explicit, acoustic };
}

export function normalize(input: string): string {
  // NFD decompose and remove combining marks (diacritics)
  let result = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Lowercase
  result = result.toLowerCase();

  // Remove content in parentheses and brackets (non-greedy)
  result = result.replace(/\([^)]*?\)/g, '');
  result = result.replace(/\[[^\]]*?\]/g, '');

  // Unify feat variants: feat./ft./featuring/ft to 'feat'
  result = result.replace(/\b(?:feat\.|ft\.|featuring|ft)\b/g, 'feat');

  // Remove Unicode punctuation
  result = result.replace(/\p{P}/gu, '');

  // Collapse whitespace and trim
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}
