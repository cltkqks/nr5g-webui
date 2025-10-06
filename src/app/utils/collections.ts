export function appendWithLimit<T>(items: T[], next: T, limit: number): T[] {
  const combined = [...items, next];
  return combined.length > limit
    ? combined.slice(combined.length - limit)
    : combined;
}

export function appendManyWithLimit<T>(
  items: T[],
  nextItems: T[],
  limit: number
): T[] {
  if (nextItems.length === 0) {
    return items;
  }
  const combined = [...items, ...nextItems];
  return combined.length > limit
    ? combined.slice(combined.length - limit)
    : combined;
}
