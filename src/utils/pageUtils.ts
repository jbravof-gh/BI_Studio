import { CanvasDocument, CanvasElement, CanvasPage } from '../types';

/**
 * Ensures a CanvasDocument has valid pages array and activePageIndex.
 * Synchronizes doc.elements with the active page's elements.
 */
export function normalizeDocumentPages(doc: CanvasDocument): CanvasDocument {
  let pages: CanvasPage[] = doc.pages ? [...doc.pages] : [];

  if (pages.length === 0) {
    // Migrate single-page document to multi-page structure
    pages = [
      {
        id: `page_${Date.now()}_1`,
        name: 'Página 1',
        elements: doc.elements ? [...doc.elements] : [],
        backgroundColor: doc.backgroundColor || '#ffffff',
        width: doc.width || 960,
        height: doc.height || 680
      }
    ];
  }

  let activeIndex = typeof doc.activePageIndex === 'number' ? doc.activePageIndex : 0;
  if (activeIndex < 0) activeIndex = 0;
  if (activeIndex >= pages.length) activeIndex = pages.length - 1;

  const activePage = pages[activeIndex];
  
  // Authoritative active values: prefer current doc state (which carries latest user/footer changes)
  // falling back to activePage, then sensible defaults.
  const targetWidth = doc.width || activePage?.width || 960;
  const targetHeight = doc.height || activePage?.height || 680;
  const targetBg = doc.backgroundColor || activePage?.backgroundColor || '#ffffff';
  const targetElements = doc.elements ?? activePage?.elements ?? [];

  // Keep the active page record synchronized with the document's active dimensions, background, and elements
  if (activePage) {
    pages[activeIndex] = {
      ...activePage,
      width: targetWidth,
      height: targetHeight,
      backgroundColor: targetBg,
      elements: targetElements
    };
  }

  return {
    ...doc,
    pages,
    activePageIndex: activeIndex,
    pageTabsPosition: doc.pageTabsPosition || 'bottom',
    showPageTabs: doc.showPageTabs !== undefined ? doc.showPageTabs : true,
    elements: targetElements,
    width: targetWidth,
    height: targetHeight,
    backgroundColor: targetBg
  };
}

/**
 * Creates a new blank page and switches to it.
 */
export function addNewPage(doc: CanvasDocument, customName?: string): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  const pageNumber = normalized.pages!.length + 1;
  const newPageName = customName?.trim() || `Página ${pageNumber}`;

  const newPage: CanvasPage = {
    id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: newPageName,
    elements: [],
    backgroundColor: normalized.backgroundColor,
    width: normalized.width,
    height: normalized.height
  };

  // First sync current active page elements and dimensions
  const updatedPages = [...normalized.pages!];
  updatedPages[normalized.activePageIndex!] = {
    ...updatedPages[normalized.activePageIndex!],
    elements: [...normalized.elements],
    width: normalized.width,
    height: normalized.height,
    backgroundColor: normalized.backgroundColor
  };

  updatedPages.push(newPage);
  const newActiveIndex = updatedPages.length - 1;

  return {
    ...normalized,
    pages: updatedPages,
    activePageIndex: newActiveIndex,
    elements: [],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Duplicates a page along with all its elements (with fresh IDs).
 */
export function duplicatePage(doc: CanvasDocument, pageIndexToDuplicate?: number): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  const index = typeof pageIndexToDuplicate === 'number' ? pageIndexToDuplicate : normalized.activePageIndex!;

  if (index < 0 || index >= normalized.pages!.length) return normalized;

  const sourcePage = normalized.pages![index];
  
  // Clone elements with new unique IDs
  const clonedElements: CanvasElement[] = (sourcePage.elements || []).map((el, i) => ({
    ...el,
    id: `el_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
    name: `${el.name} (Copia)`
  }));

  const duplicatedPage: CanvasPage = {
    id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: `${sourcePage.name} (Copia)`,
    elements: clonedElements,
    backgroundColor: sourcePage.backgroundColor || normalized.backgroundColor,
    width: sourcePage.width || normalized.width,
    height: sourcePage.height || normalized.height,
    tabColor: sourcePage.tabColor,
    colorTag: sourcePage.colorTag
  };

  const updatedPages = [...normalized.pages!];
  // Sync current active page
  updatedPages[normalized.activePageIndex!] = {
    ...updatedPages[normalized.activePageIndex!],
    elements: [...normalized.elements],
    width: normalized.width,
    height: normalized.height,
    backgroundColor: normalized.backgroundColor
  };

  // Insert after source page
  updatedPages.splice(index + 1, 0, duplicatedPage);
  const newActiveIndex = index + 1;

  return {
    ...normalized,
    pages: updatedPages,
    activePageIndex: newActiveIndex,
    elements: clonedElements,
    width: duplicatedPage.width || normalized.width,
    height: duplicatedPage.height || normalized.height,
    backgroundColor: duplicatedPage.backgroundColor || normalized.backgroundColor,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Deletes a page. Won't delete if there's only 1 page.
 */
export function deletePage(doc: CanvasDocument, pageIndexToDelete: number): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  if (normalized.pages!.length <= 1) return normalized; // Cannot delete last remaining page

  const updatedPages = [...normalized.pages!];
  updatedPages.splice(pageIndexToDelete, 1);

  let newActiveIndex = normalized.activePageIndex!;
  if (newActiveIndex >= updatedPages.length) {
    newActiveIndex = updatedPages.length - 1;
  } else if (pageIndexToDelete < newActiveIndex) {
    newActiveIndex = Math.max(0, newActiveIndex - 1);
  }

  const activePage = updatedPages[newActiveIndex];

  return {
    ...normalized,
    pages: updatedPages,
    activePageIndex: newActiveIndex,
    elements: activePage.elements || [],
    width: activePage.width || normalized.width,
    height: activePage.height || normalized.height,
    backgroundColor: activePage.backgroundColor || normalized.backgroundColor,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Renames a page at specified index.
 */
export function renamePage(doc: CanvasDocument, pageIndex: number, newName: string): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  if (pageIndex < 0 || pageIndex >= normalized.pages!.length) return normalized;
  if (!newName.trim()) return normalized;

  const updatedPages = [...normalized.pages!];
  updatedPages[pageIndex] = {
    ...updatedPages[pageIndex],
    name: newName.trim()
  };

  return {
    ...normalized,
    pages: updatedPages,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Reorders pages by moving a page from fromIndex to toIndex.
 */
export function reorderPages(doc: CanvasDocument, fromIndex: number, toIndex: number): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  if (
    fromIndex < 0 ||
    fromIndex >= normalized.pages!.length ||
    toIndex < 0 ||
    toIndex >= normalized.pages!.length ||
    fromIndex === toIndex
  ) {
    return normalized;
  }

  const updatedPages = [...normalized.pages!];
  const [movedPage] = updatedPages.splice(fromIndex, 1);
  updatedPages.splice(toIndex, 0, movedPage);

  let newActiveIndex = normalized.activePageIndex!;
  if (normalized.activePageIndex === fromIndex) {
    newActiveIndex = toIndex;
  } else if (
    fromIndex < normalized.activePageIndex! &&
    toIndex >= normalized.activePageIndex!
  ) {
    newActiveIndex -= 1;
  } else if (
    fromIndex > normalized.activePageIndex! &&
    toIndex <= normalized.activePageIndex!
  ) {
    newActiveIndex += 1;
  }

  return {
    ...normalized,
    pages: updatedPages,
    activePageIndex: newActiveIndex,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Switches the active page, saving current elements to the current page first.
 */
export function switchActivePage(doc: CanvasDocument, targetIndex: number): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  if (targetIndex < 0 || targetIndex >= normalized.pages!.length) return normalized;
  if (targetIndex === normalized.activePageIndex) return normalized;

  // Save current elements and dimensions to current page
  const updatedPages = [...normalized.pages!];
  updatedPages[normalized.activePageIndex!] = {
    ...updatedPages[normalized.activePageIndex!],
    elements: [...normalized.elements],
    width: normalized.width,
    height: normalized.height,
    backgroundColor: normalized.backgroundColor
  };

  const targetPage = updatedPages[targetIndex];

  return {
    ...normalized,
    pages: updatedPages,
    activePageIndex: targetIndex,
    elements: targetPage.elements ? [...targetPage.elements] : [],
    width: targetPage.width || normalized.width,
    height: targetPage.height || normalized.height,
    backgroundColor: targetPage.backgroundColor || normalized.backgroundColor
  };
}

/**
 * Updates the elements of the current active page.
 */
export function updateActivePageElements(doc: CanvasDocument, newElements: CanvasElement[]): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  const activeIndex = normalized.activePageIndex!;

  const updatedPages = [...normalized.pages!];
  if (updatedPages[activeIndex]) {
    updatedPages[activeIndex] = {
      ...updatedPages[activeIndex],
      elements: newElements
    };
  }

  return {
    ...normalized,
    pages: updatedPages,
    elements: newElements,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Sets the position of the page tabs ('bottom' | 'left').
 */
export function setPageTabsPosition(doc: CanvasDocument, position: 'bottom' | 'left'): CanvasDocument {
  return {
    ...doc,
    pageTabsPosition: position
  };
}

/**
 * Toggles visibility of page tabs / sheet labels.
 */
export function setPageTabsVisibility(doc: CanvasDocument, show?: boolean): CanvasDocument {
  return {
    ...doc,
    showPageTabs: show !== undefined ? show : !doc.showPageTabs
  };
}

/**
 * Assigns a custom label/tag color to a page tab, saving it in the page object.
 */
export function setPageColor(doc: CanvasDocument, pageIndex: number, color?: string): CanvasDocument {
  const normalized = normalizeDocumentPages(doc);
  if (pageIndex < 0 || pageIndex >= normalized.pages!.length) return normalized;

  const updatedPages = [...normalized.pages!];
  const trimmedColor = color?.trim() || undefined;

  updatedPages[pageIndex] = {
    ...updatedPages[pageIndex],
    tabColor: trimmedColor,
    colorTag: trimmedColor
  };

  return {
    ...normalized,
    pages: updatedPages,
    updatedAt: new Date().toISOString()
  };
}
