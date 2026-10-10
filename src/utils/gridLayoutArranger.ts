import { CanvasElement } from '../types';

export interface GridArrangeOptions {
  scope?: 'all' | 'selected';
  selectedIds?: string[];
  gridStep?: number; // Step for snapping (default: 20)
  margin?: number;   // Outer margin from canvas edges (default: 32)
  gap?: number;      // Spacing between elements horizontally and vertically (default: 20)
  columns?: number;  // Optional target columns count
}

export interface GridArrangeResult {
  elements: CanvasElement[];
  requiredHeight: number;
  changedCount: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Checks if two axis-aligned bounding boxes overlap (strict intersection).
 */
function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Snap a value to the nearest multiple of step.
 */
function snap(val: number, step: number): number {
  return Math.round(val / step) * step;
}

/**
 * Categorizes an element's structural tier for intuitive visual hierarchy ordering.
 */
function getElementHierarchyTier(el: CanvasElement): number {
  // Tier 1: Main Page Header / Titles
  if (el.type === 'text' && ((el.style.fontSize && el.style.fontSize >= 18) || el.y < 80)) {
    return 1;
  }
  // Tier 2: Filters and top control bars
  if (el.type === 'filter' || (el.type === 'badge' && el.height <= 50)) {
    return 2;
  }
  // Tier 3: KPIs and small metric indicators
  if (el.type === 'kpi' || (el.height <= 140 && el.width <= 260)) {
    return 3;
  }
  // Tier 4: Charts, detail cards, and containers
  if (el.type === 'chart' || el.type === 'card' || el.type === 'detailCard' || el.type === 'drilldown') {
    return 4;
  }
  // Tier 5: Tables, data grids, matrices, query tables
  if (el.type === 'table' || el.type === 'queryTable' || el.type === 'matrix') {
    return 5;
  }
  // Tier 6: Other elements (images, qrcodes, etc.)
  return 6;
}

/**
 * Automatically arranges canvas elements using a responsive grid layout algorithm.
 * - Completely avoids element overlap.
 * - Perfectly aligns elements to grid steps and row baselines.
 * - Strictly respects locked elements (they never move and act as obstacles).
 * - Preserves group containers and relative coordinates of group children.
 */
export function autoArrangeGridLayout(
  elements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number,
  options: GridArrangeOptions = {}
): GridArrangeResult {
  if (!elements || elements.length === 0) {
    return { elements: [], requiredHeight: canvasHeight, changedCount: 0 };
  }

  const {
    scope = 'all',
    selectedIds = [],
    gridStep = 20,
    margin = 32,
    gap = 20
  } = options;

  const isSelectionScope = scope === 'selected' && selectedIds.length >= 2;

  // Identify group children so we don't arrange them independently of their group container
  const groupContainers = elements.filter(el => el.isGroup || (el.type === 'container' && el.childrenIds && el.childrenIds.length > 0));
  const childIdSet = new Set<string>();
  groupContainers.forEach(g => {
    (g.childrenIds || []).forEach(cid => childIdSet.add(cid));
  });
  // Also check elements with groupId
  elements.forEach(el => {
    if (el.groupId) childIdSet.add(el.id);
  });

  // Top-level elements to consider
  const topLevelElements = elements.filter(el => !childIdSet.has(el.id));

  // Determine which elements should be arranged
  const elementsToArrange = topLevelElements.filter(el => {
    if (el.locked) return false; // Locked elements are never moved
    if (isSelectionScope) {
      return selectedIds.includes(el.id);
    }
    return true;
  });

  if (elementsToArrange.length === 0) {
    return { elements: [...elements], requiredHeight: canvasHeight, changedCount: 0 };
  }

  // Locked elements and untouched elements act as static obstacles
  const staticObstacles: Rect[] = elements
    .filter(el => {
      if (el.locked) return true;
      if (isSelectionScope && !selectedIds.includes(el.id)) return true;
      return false;
    })
    .map(el => ({
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height
    }));

  // Define canvas layout bounding bounds
  let startX = margin;
  let startY = margin;
  let availableWidth = canvasWidth - 2 * margin;

  if (isSelectionScope) {
    // If arranging selected elements, anchor near the selection bounding box origin
    const minX = Math.min(...elementsToArrange.map(e => e.x));
    const minY = Math.min(...elementsToArrange.map(e => e.y));
    const maxX = Math.max(...elementsToArrange.map(e => e.x + e.width));
    
    startX = snap(Math.max(margin, minX), gridStep);
    startY = snap(Math.max(margin, minY), gridStep);
    const selectionWidth = maxX - minX;
    availableWidth = Math.max(selectionWidth, canvasWidth - startX - margin);
  }

  // Sort elements in a balanced reading order:
  // Primary: Hierarchy Tier (titles -> filters -> KPIs -> charts -> tables)
  // Secondary: Vertical position Y
  // Tertiary: Horizontal position X
  const sorted = [...elementsToArrange].sort((a, b) => {
    const tierA = getElementHierarchyTier(a);
    const tierB = getElementHierarchyTier(b);
    if (tierA !== tierB) return tierA - tierB;
    if (Math.abs(a.y - b.y) > 40) return a.y - b.y;
    return a.x - b.x;
  });

  // Track placed rectangles to avoid overlapping
  const placedRects: Rect[] = [...staticObstacles];
  const newPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  let curX = startX;
  let curY = startY;
  let currentRowMaxHeight = 0;
  let isFirstInRow = true;

  for (const el of sorted) {
    // Clean snapped width and height
    let w = snap(el.width, gridStep);
    let h = snap(el.height, gridStep);
    w = Math.max(gridStep * 2, Math.min(w, availableWidth));
    h = Math.max(gridStep * 2, h);

    // If item doesn't fit in current row and it's not the first item, wrap to next row
    if (!isFirstInRow && curX + w > startX + availableWidth) {
      curY = snap(curY + currentRowMaxHeight + gap, gridStep);
      curX = startX;
      currentRowMaxHeight = 0;
      isFirstInRow = true;
    }

    // Find collision-free placement
    let candidateX = curX;
    let candidateY = curY;
    let attempts = 0;
    const maxAttempts = 150;

    while (attempts < maxAttempts) {
      const candidateRect: Rect = {
        x: candidateX,
        y: candidateY,
        width: w,
        height: h
      };

      // Check collision with any placed or static rectangle
      const colliding = placedRects.find(p => rectsOverlap(candidateRect, p));

      if (!colliding) {
        // Found collision-free spot!
        break;
      }

      // If collided with an obstacle, attempt to jump to the right of it
      const nextCandidateX = snap(colliding.x + colliding.width + gap, gridStep);
      if (nextCandidateX + w <= startX + availableWidth) {
        candidateX = nextCandidateX;
      } else {
        // Move to the row underneath the colliding obstacle
        candidateY = snap(Math.max(candidateY, colliding.y + colliding.height + gap), gridStep);
        candidateX = startX;
        currentRowMaxHeight = 0;
      }
      attempts++;
    }

    // Save final placed position
    newPositions.set(el.id, {
      x: candidateX,
      y: candidateY,
      width: w,
      height: h
    });

    placedRects.push({
      x: candidateX,
      y: candidateY,
      width: w,
      height: h
    });

    currentRowMaxHeight = Math.max(currentRowMaxHeight, h);
    curX = snap(candidateX + w + gap, gridStep);
    curY = candidateY;
    isFirstInRow = false;
  }

  // Update elements and calculate group children offsets
  let changedCount = 0;
  const updatedElements = elements.map(el => {
    if (newPositions.has(el.id)) {
      const pos = newPositions.get(el.id)!;
      const isMoved = pos.x !== el.x || pos.y !== el.y || pos.width !== el.width || pos.height !== el.height;
      if (isMoved) changedCount++;

      return {
        ...el,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height
      };
    }
    return el;
  });

  // If any group container was moved, shift its children by the corresponding delta
  const finalElements = updatedElements.map(el => {
    if (el.groupId) {
      const oldParent = elements.find(p => p.id === el.groupId);
      const newParent = updatedElements.find(p => p.id === el.groupId);
      if (oldParent && newParent && (oldParent.x !== newParent.x || oldParent.y !== newParent.y)) {
        const dx = newParent.x - oldParent.x;
        const dy = newParent.y - oldParent.y;
        return {
          ...el,
          x: el.x + dx,
          y: el.y + dy
        };
      }
    }
    return el;
  });

  // Calculate required canvas height to avoid clipping
  const maxBottom = finalElements.reduce((max, el) => Math.max(max, el.y + el.height), 0) + margin;
  const requiredHeight = Math.max(canvasHeight, snap(maxBottom, gridStep));

  return {
    elements: finalElements,
    requiredHeight,
    changedCount
  };
}
