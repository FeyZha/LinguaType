export function normalizePersonalDictionary(terms: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const term of terms) {
    const normalized = term.trim().replace(/\s+/gu, " ");
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }
  return Array.from(byKey.values());
}
