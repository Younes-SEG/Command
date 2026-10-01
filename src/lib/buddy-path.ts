export interface BuddyBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function buddyBounds(width: number, height: number, size: number): BuddyBounds {
  const inset = size / 2 + 12;
  return {
    left: inset,
    top: inset,
    width: Math.max(1, width - inset * 2),
    height: Math.max(1, height - inset * 2),
  };
}

export const edgeLength = (bounds: BuddyBounds) => 2 * (bounds.width + bounds.height);
export const wrapEdge = (distance: number, length: number) =>
  ((distance % length) + length) % length;

/** Clockwise around the viewport, starting at the bottom-left corner. */
export function edgePoint(distance: number, bounds: BuddyBounds) {
  const { left, top, width, height } = bounds;
  const s = wrapEdge(distance, edgeLength(bounds));
  if (s <= width) return { x: left + s, y: top + height };
  if (s <= width + height) return { x: left + width, y: top + height - (s - width) };
  if (s <= 2 * width + height) return { x: left + width - (s - width - height), y: top };
  return { x: left, y: top + (s - 2 * width - height) };
}

/** Project the cursor onto an edge; the buddy never cuts across the work area. */
export function cursorEdge(x: number, y: number, bounds: BuddyBounds) {
  const localX = Math.max(0, Math.min(bounds.width, x - bounds.left));
  const localY = Math.max(0, Math.min(bounds.height, y - bounds.top));
  const choices = [
    { gap: Math.abs(y - bounds.top - bounds.height), distance: localX },
    {
      gap: Math.abs(x - bounds.left - bounds.width),
      distance: bounds.width + bounds.height - localY,
    },
    { gap: Math.abs(y - bounds.top), distance: 2 * bounds.width + bounds.height - localX },
    { gap: Math.abs(x - bounds.left), distance: 2 * bounds.width + bounds.height + localY },
  ];
  return choices.reduce((nearest, choice) => (choice.gap < nearest.gap ? choice : nearest))
    .distance;
}

export function edgeDelta(from: number, to: number, length: number) {
  return wrapEdge(to - from + length / 2, length) - length / 2;
}
