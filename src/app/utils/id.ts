export function createId(prefix: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const uuid =
    typeof g.crypto?.randomUUID === "function" ? g.crypto.randomUUID() : null;
  const fallback = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${uuid ?? fallback}`;
}
