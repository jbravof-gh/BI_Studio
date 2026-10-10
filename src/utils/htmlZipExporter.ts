import JSZip from 'jszip';
import QRCode from 'qrcode';
import { CanvasDocument, CanvasElement, CanvasPage } from '../types';

export interface HtmlZipExportOptions {
  scope: 'current' | 'all';
  pageIndex?: number;
  filename?: string;
  responsiveMode: 'fit-screen' | 'scrollable' | 'fixed';
  theme: 'auto' | 'light' | 'dark' | 'toggle';
  includeDataJson: boolean;
  includeReadme: boolean;
  extractImages: boolean;
  title?: string;
  author?: string;
  description?: string;
  enableTableSorting?: boolean;
  enableInteractiveFilters?: boolean;
}

export interface ExportProgressCallback {
  (progress: { percent: number; statusText: string }): void;
}

/**
 * Sanitize filename to avoid path traversal and invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

/**
 * Extract image data from data URL
 */
function parseDataUrl(dataUrl: string): { extension: string; base64: string } | null {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.+)$/);
  if (!match) return null;
  let ext = match[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';
  if (ext === 'svg+xml') ext = 'svg';
  return { extension: ext, base64: match[2] };
}

/**
 * Generate CSS Stylesheet for the HTML package
 */
function generateCss(
  canvasWidth: number,
  canvasHeight: number,
  options: HtmlZipExportOptions
): string {
  return `/* ==========================================================================
   Canvas Export - Responsive HTML Package
   Auto-generated Stylesheet
   ========================================================================== */

:root {
  --canvas-width: ${canvasWidth}px;
  --canvas-height: ${canvasHeight}px;
  --bg-workspace: #f1f5f9;
  --bg-canvas: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --border-subtle: #cbd5e1;
  --card-bg: #ffffff;
  --accent-color: #5865f2;
  --font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

[data-theme="dark"] {
  --bg-workspace: #0f1115;
  --bg-canvas: #18191c;
  --text-main: #f8fafc;
  --text-muted: #9ca3af;
  --border-color: #2f3136;
  --border-subtle: #3f4248;
  --card-bg: #202225;
  --accent-color: #5865f2;
}

/* Reset & Global */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  background-color: var(--bg-workspace);
  color: var(--text-main);
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Top App Bar & Navigation */
.app-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.app-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-logo {
  width: 24px;
  height: 24px;
  color: var(--accent-color);
}

.app-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-main);
}

.app-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(88, 101, 242, 0.1);
  color: var(--accent-color);
  border: 1px solid rgba(88, 101, 242, 0.2);
}

/* Page Tabs in Header */
.page-nav-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
}

.page-nav-tab {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  text-decoration: none;
  color: var(--text-muted);
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.page-nav-tab:hover {
  color: var(--text-main);
  background-color: rgba(0, 0, 0, 0.04);
}

[data-theme="dark"] .page-nav-tab:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.page-nav-tab.active {
  color: var(--accent-color);
  background-color: rgba(88, 101, 242, 0.08);
  border-color: rgba(88, 101, 242, 0.3);
}

/* Header Actions */
.app-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.theme-toggle-btn:hover {
  color: var(--text-main);
  border-color: var(--border-subtle);
  background-color: rgba(0, 0, 0, 0.03);
}

.print-btn {
  background: none;
  border: 1px solid var(--border-color);
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.print-btn:hover {
  color: var(--text-main);
  border-color: var(--border-subtle);
}

/* Canvas Viewport */
.viewport-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 48px);
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
}

${
  options.responsiveMode === 'fit-screen'
    ? `
/* Fit-to-screen scale container */
.canvas-scale-container {
  position: relative;
  width: var(--canvas-width);
  height: var(--canvas-height);
  transform-origin: top center;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}
`
    : `
.canvas-scale-container {
  position: relative;
  width: var(--canvas-width);
  height: var(--canvas-height);
  flex-shrink: 0;
}
`
}

/* Canvas Document Card */
.canvas-root {
  position: relative;
  width: var(--canvas-width);
  height: var(--canvas-height);
  background-color: var(--bg-canvas);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* Canvas Elements Container */
.canvas-element {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
}

/* Element Typographic & Control Base Styles */
.canvas-element h1,
.canvas-element h2,
.canvas-element h3,
.canvas-element h4,
.canvas-element p {
  margin: 0;
  line-height: inherit;
}

/* Table Controls */
.canvas-table-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  border-radius: inherit;
}

.canvas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}

.canvas-table th {
  padding: 8px 10px;
  font-weight: 600;
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  cursor: pointer;
  user-select: none;
}

.canvas-table th:hover {
  background-color: rgba(88, 101, 242, 0.05);
}

.canvas-table th::after {
  content: ' ⇅';
  font-size: 10px;
  opacity: 0.4;
}

.canvas-table th.sort-asc::after {
  content: ' ▲';
  opacity: 1;
  color: var(--accent-color);
}

.canvas-table th.sort-desc::after {
  content: ' ▼';
  opacity: 1;
  color: var(--accent-color);
}

.canvas-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--border-color);
}

.canvas-table tr:hover {
  background-color: rgba(88, 101, 242, 0.04);
}

/* KPI Cards */
.kpi-card-root {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 12px;
}

/* Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

/* Images & QR */
.canvas-image {
  width: 100%;
  height: 100%;
  display: block;
}

/* Print Overrides */
@media print {
  .app-header {
    display: none !important;
  }
  .viewport-wrapper {
    padding: 0 !important;
    overflow: visible !important;
    height: auto !important;
  }
  .canvas-scale-container {
    transform: none !important;
  }
  .canvas-root {
    border: none !important;
    box-shadow: none !important;
  }
}
`;
}

/**
 * Generate JS Application Script for the HTML package
 */
function generateJs(
  canvasWidth: number,
  canvasHeight: number,
  options: HtmlZipExportOptions
): string {
  return `/* ==========================================================================
   Canvas Export - Responsive HTML Package
   Auto-generated Client Script
   ========================================================================== */

(function () {
  'use strict';

  const CANVAS_ORIGINAL_WIDTH = ${canvasWidth};
  const CANVAS_ORIGINAL_HEIGHT = ${canvasHeight};
  const RESPONSIVE_MODE = '${options.responsiveMode}';

  /**
   * Automatically scales the canvas to fit the available browser window.
   */
  function fitCanvasToViewport() {
    if (RESPONSIVE_MODE !== 'fit-screen') return;

    const scaleContainer = document.querySelector('.canvas-scale-container');
    const viewportWrapper = document.querySelector('.viewport-wrapper');
    if (!scaleContainer || !viewportWrapper) return;

    // Available dimensions minus padding
    const paddingX = 32;
    const paddingY = 32;
    const availWidth = Math.max(300, viewportWrapper.clientWidth - paddingX);
    const availHeight = Math.max(300, viewportWrapper.clientHeight - paddingY);

    const scaleX = availWidth / CANVAS_ORIGINAL_WIDTH;
    const scaleY = availHeight / CANVAS_ORIGINAL_HEIGHT;
    const fitScale = Math.min(scaleX, scaleY, 1.3);

    scaleContainer.style.transform = 'scale(' + fitScale + ')';
  }

  /**
   * Theme Toggle Manager
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('canvas_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('canvas_theme', nextTheme);
        updateToggleBtnText(toggleBtn, nextTheme);
      });
      updateToggleBtnText(toggleBtn, document.documentElement.getAttribute('data-theme') || 'light');
    }
  }

  function updateToggleBtnText(btn, theme) {
    const label = btn.querySelector('.theme-label');
    if (label) {
      label.textContent = theme === 'dark' ? 'Tema Claro' : 'Tema Oscuro';
    }
  }

  /**
   * Interactive Table Column Sorter
   */
  function initTableSorting() {
    const tables = document.querySelectorAll('.canvas-table');
    tables.forEach(function (table) {
      const headers = table.querySelectorAll('th');
      headers.forEach(function (header, colIdx) {
        header.addEventListener('click', function () {
          const tbody = table.querySelector('tbody');
          if (!tbody) return;
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const currentAsc = header.classList.contains('sort-asc');

          // Reset all header states
          headers.forEach(function (h) {
            h.classList.remove('sort-asc', 'sort-desc');
          });

          const sortAsc = !currentAsc;
          header.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');

          rows.sort(function (rowA, rowB) {
            const cellA = rowA.children[colIdx] ? rowA.children[colIdx].innerText.trim() : '';
            const cellB = rowB.children[colIdx] ? rowB.children[colIdx].innerText.trim() : '';

            // Numeric check
            const numA = parseFloat(cellA.replace(/[^0-9.-]/g, ''));
            const numB = parseFloat(cellB.replace(/[^0-9.-]/g, ''));

            if (!isNaN(numA) && !isNaN(numB) && cellA.match(/[0-9]/) && cellB.match(/[0-9]/)) {
              return sortAsc ? numA - numB : numB - numA;
            }

            return sortAsc ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
          });

          // Re-append sorted rows
          rows.forEach(function (r) { tbody.appendChild(r); });
        });
      });
    });
  }

  // Window Listeners
  window.addEventListener('resize', fitCanvasToViewport);
  window.addEventListener('DOMContentLoaded', function () {
    fitCanvasToViewport();
    initTheme();
    ${options.enableTableSorting !== false ? 'initTableSorting();' : ''}
  });

  // Re-run scale calculation after load (images/fonts loaded)
  window.addEventListener('load', fitCanvasToViewport);
})();
`;
}

/**
 * Generate README.md file for the ZIP package
 */
function generateReadme(
  document: CanvasDocument,
  options: HtmlZipExportOptions,
  pagesExported: string[]
): string {
  const dateStr = new Date().toLocaleString('es-ES', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  return `# ${options.title || document.name || 'Reporte de Diseño Canvas'}

Este archivo ZIP contiene la exportación completa a formato **HTML5 interactivo y responsive** generado desde el diseñador visual de canvas.

## 🚀 Cómo Visualizar el Contenido
1. Descomprime el archivo ZIP en una carpeta de tu equipo.
2. Haz doble clic en **\`index.html\`** para abrir el diseño en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
3. **No requiere servidor web** ni conexión a internet para renderizarse: todos los estilos, scripts e imágenes están incluidos de forma autónoma.

---

## 📁 Estructura del Contenido
\`\`\`text
├── index.html        # Página principal de entrada
${pagesExported
  .filter((p) => p !== 'index.html')
  .map((p) => `├── ${p.padEnd(16, ' ')} # Página adicional del reporte\n`)
  .join('')}├── css/
│   └── styles.css    # Hojas de estilo CSS3, variables y adaptabilidad responsive
├── js/
│   └── app.js        # Scripts de escalado automático, temas y ordenación de tablas
├── assets/           # Imágenes, logotipos y códigos QR extraídos
└── data/
    └── data.json     # Metadatos del documento y datos de tablas en formato JSON
\`\`\`

---

## ⚙️ Características Incluidas
- **Ajuste Responsive (${options.responsiveMode})**: El canvas se ajusta automáticamente a cualquier tamaño de pantalla manteniendo su proporción original.
- **Modo Oscuro / Claro**: ${
    options.theme === 'toggle'
      ? 'Incluye selector interactivo para alternar entre tema oscuro y claro.'
      : `Configurado con tema ${options.theme}.`
  }
- **Interactividad**: Ordenación interactiva de columnas en tablas al hacer clic en sus encabezados.
- **Preparado para Imprimir**: Compatible con atajo \`Ctrl+P\` o botón de impresión para exportar a PDF o impresora física sin bordes ni barras de navegación.

---

*Generado automáticamente el ${dateStr}*
`;
}

/**
 * Extract HTML string from the live canvas node or DOM elements
 */
async function processCanvasNode(
  canvasNode: HTMLElement,
  assetsFolder: JSZip,
  options: HtmlZipExportOptions,
  assetCounter: { count: number }
): Promise<string> {
  // Clone the node so we do not mutate live DOM
  const clone = canvasNode.cloneNode(true) as HTMLElement;

  // Remove editor-specific overlays, ruler markers, selection rings
  const removeSelectors = [
    '.user-guide-line',
    '.smart-guide',
    '.selection-box',
    '.resize-handle',
    '.canvas-grid-pattern-dark',
    '.guide-line'
  ];

  removeSelectors.forEach((sel) => {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Extract base64 images into assets/ folder if requested
  if (options.extractImages) {
    const images = clone.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');
      if (src && src.startsWith('data:image/')) {
        const parsed = parseDataUrl(src);
        if (parsed) {
          assetCounter.count++;
          const assetName = `img_${assetCounter.count}.${parsed.extension}`;
          assetsFolder.file(assetName, parsed.base64, { base64: true });
          img.setAttribute('src', `assets/${assetName}`);
          img.setAttribute('loading', 'lazy');
        }
      }
    }

    // Process inline background-image styles
    const elementsWithBg = clone.querySelectorAll('[style*="url("]');
    for (const el of Array.from(elementsWithBg)) {
      const styleAttr = el.getAttribute('style') || '';
      const bgMatch = styleAttr.match(/url\(["']?(data:image\/[^"']+)["']?\)/);
      if (bgMatch) {
        const parsed = parseDataUrl(bgMatch[1]);
        if (parsed) {
          assetCounter.count++;
          const assetName = `bg_${assetCounter.count}.${parsed.extension}`;
          assetsFolder.file(assetName, parsed.base64, { base64: true });
          const newStyle = styleAttr.replace(bgMatch[0], `url(assets/${assetName})`);
          el.setAttribute('style', newStyle);
        }
      }
    }
  }

  return clone.innerHTML;
}

/**
 * Generate full HTML document wrapper for a page
 */
function buildFullHtmlPage(
  pageTitle: string,
  canvasWidth: number,
  canvasHeight: number,
  canvasBg: string,
  bodyContent: string,
  options: HtmlZipExportOptions,
  allPages: { name: string; filename: string }[],
  currentPageFilename: string
): string {
  const themeAttr =
    options.theme === 'dark'
      ? 'data-theme="dark"'
      : options.theme === 'light'
      ? 'data-theme="light"'
      : '';

  return `<!DOCTYPE html>
<html lang="es" ${themeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- Header Bar with Page Navigation & Actions -->
  <header class="app-header">
    <div class="app-title-group">
      <svg class="app-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
        <circle cx="9" cy="9" r="2"></circle>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
      </svg>
      <span class="app-title">${pageTitle}</span>
      <span class="app-badge">${canvasWidth} × ${canvasHeight}px</span>
    </div>

    <!-- Multi-page Navigation Tabs -->
    ${
      allPages.length > 1
        ? `<nav class="page-nav-tabs">
      ${allPages
        .map(
          (p) =>
            `<a href="${p.filename}" class="page-nav-tab ${
              p.filename === currentPageFilename ? 'active' : ''
            }">${p.name}</a>`
        )
        .join('\n      ')}
    </nav>`
        : ''
    }

    <!-- Header Actions (Theme toggle & print) -->
    <div class="app-header-actions">
      ${
        options.theme === 'toggle'
          ? `<button id="theme-toggle-btn" class="theme-toggle-btn" title="Alternar tema de color">
        <span class="theme-icon">🌓</span>
        <span class="theme-label">Tema</span>
      </button>`
          : ''
      }
      <button class="print-btn" onclick="window.print()" title="Imprimir o guardar como PDF (Ctrl+P)">
        <span>🖨️</span>
        <span>Imprimir</span>
      </button>
    </div>
  </header>

  <!-- Viewport Wrapper -->
  <main class="viewport-wrapper">
    <div class="canvas-scale-container" data-width="${canvasWidth}" data-height="${canvasHeight}">
      <div class="canvas-root" style="background-color: ${canvasBg};">
        ${bodyContent}
      </div>
    </div>
  </main>

  <!-- Interactive Client Scripts -->
  <script src="js/app.js"></script>
</body>
</html>
`;
}

/**
 * Main export function: compiles canvas contents into a structured ZIP file.
 */
export async function exportCanvasToHtmlZip(
  canvasDoc: CanvasDocument,
  dbRecords: Record<string, Record<string, any>[]>,
  options: HtmlZipExportOptions,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const zip = new JSZip();

  // Create subfolders
  const cssFolder = zip.folder('css')!;
  const jsFolder = zip.folder('js')!;
  const assetsFolder = zip.folder('assets')!;
  const dataFolder = zip.folder('data')!;

  onProgress?.({ percent: 10, statusText: 'Iniciando generación del paquete HTML...' });

  const effectiveWidth = canvasDoc.width || 1280;
  const effectiveHeight = canvasDoc.height || 720;
  const docTitle = options.title || canvasDoc.name || 'Reporte de Diseño';

  // 1. Add CSS Stylesheet
  const cssContent = generateCss(effectiveWidth, effectiveHeight, options);
  cssFolder.file('styles.css', cssContent);

  // 2. Add JavaScript Engine
  const jsContent = generateJs(effectiveWidth, effectiveHeight, options);
  jsFolder.file('app.js', jsContent);

  onProgress?.({ percent: 25, statusText: 'Compilando hojas de estilo y scripts...' });

  // 3. Process Pages
  const pages = canvasDoc.pages && canvasDoc.pages.length > 0
    ? canvasDoc.pages
    : [{ id: 'p1', name: 'Hoja 1', elements: canvasDoc.elements }];

  const pagesToProcess: { page: CanvasPage; index: number }[] = [];

  if (options.scope === 'all') {
    pages.forEach((p, idx) => pagesToProcess.push({ page: p, index: idx }));
  } else {
    const targetIdx = options.pageIndex !== undefined ? options.pageIndex : (canvasDoc.activePageIndex || 0);
    const p = pages[targetIdx] || pages[0];
    pagesToProcess.push({ page: p, index: targetIdx });
  }

  // Build manifest of page filenames
  const pageFilesManifest = pagesToProcess.map((item, i) => {
    const filename = i === 0 ? 'index.html' : `pagina_${item.index + 1}.html`;
    return {
      name: item.page.name || `Hoja ${item.index + 1}`,
      filename
    };
  });

  const assetCounter = { count: 0 };
  const exportedFilenames: string[] = [];

  for (let i = 0; i < pagesToProcess.length; i++) {
    const { page, index } = pagesToProcess[i];
    const manifestItem = pageFilesManifest[i];
    const pageTitle = `${docTitle} - ${manifestItem.name}`;
    const percent = Math.round(30 + (i / pagesToProcess.length) * 40);

    onProgress?.({
      percent,
      statusText: `Procesando elementos de ${manifestItem.name} (${i + 1}/${pagesToProcess.length})...`
    });

    // Try finding rendered DOM element first
    let pageNode = window.document.getElementById('active-canvas-surface');
    if (pageNode && index !== (canvasDoc.activePageIndex || 0)) {
      pageNode = window.document.getElementById(`pdf-offscreen-page-node-${index}`) || pageNode;
    }

    let bodyInnerHtml = '';

    if (pageNode && index === (canvasDoc.activePageIndex || 0)) {
      bodyInnerHtml = await processCanvasNode(pageNode, assetsFolder, options, assetCounter);
    } else {
      // Build HTML representation from element models
      const elementsToRender = page.elements || [];
      const renderedElementsHtml: string[] = [];

      for (const el of elementsToRender) {
        if (el.visible === false) continue;

        let elContentHtml = '';
        const style = el.style || {};

        if (el.type === 'text') {
          const text = el.binding?.template || el.name || '';
          elContentHtml = `<div style="padding: ${style.padding || 4}px; font-size: ${style.fontSize || 14}px; color: ${style.color || 'inherit'}; font-weight: ${style.fontWeight || 'normal'}; text-align: ${style.textAlign || 'left'};">${text}</div>`;
        } else if (el.type === 'kpi') {
          const prefix = el.binding?.prefix || '';
          const suffix = el.binding?.suffix || '';
          const val = '12,540';
          elContentHtml = `
            <div class="kpi-card-root" style="background-color: ${style.backgroundColor || 'var(--card-bg)'}; border: ${style.borderWidth || 1}px solid ${style.borderColor || 'var(--border-color)'}; border-radius: ${style.borderRadius || 8}px;">
              <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">${el.name}</div>
              <div style="font-size: ${style.fontSize || 24}px; font-weight: 700; color: ${style.color || 'var(--text-main)'}; margin-top: 4px;">${prefix}${val}${suffix}</div>
            </div>`;
        } else if (el.type === 'image') {
          const imgUrl = el.binding?.imageUrl || '';
          if (imgUrl.startsWith('data:image/')) {
            const parsed = parseDataUrl(imgUrl);
            if (parsed && options.extractImages) {
              assetCounter.count++;
              const assetName = `img_${assetCounter.count}.${parsed.extension}`;
              assetsFolder.file(assetName, parsed.base64, { base64: true });
              elContentHtml = `<img src="assets/${assetName}" class="canvas-image" style="object-fit: ${el.binding?.imageFit || 'cover'};" alt="${el.name}">`;
            } else {
              elContentHtml = `<img src="${imgUrl}" class="canvas-image" style="object-fit: ${el.binding?.imageFit || 'cover'};" alt="${el.name}">`;
            }
          } else if (imgUrl) {
            elContentHtml = `<img src="${imgUrl}" class="canvas-image" style="object-fit: ${el.binding?.imageFit || 'cover'};" alt="${el.name}">`;
          } else {
            elContentHtml = `<div style="width:100%;height:100%;background:rgba(88,101,242,0.1);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">Imagen</div>`;
          }
        } else if (el.type === 'qrcode') {
          try {
            const qrText = el.binding?.template || 'https://ai.studio/build';
            const qrDataUrl = await QRCode.toDataURL(qrText, { width: 256, margin: 1 });
            const parsed = parseDataUrl(qrDataUrl);
            if (parsed && options.extractImages) {
              assetCounter.count++;
              const assetName = `qr_${assetCounter.count}.png`;
              assetsFolder.file(assetName, parsed.base64, { base64: true });
              elContentHtml = `<img src="assets/${assetName}" class="canvas-image" style="object-fit: contain;" alt="Código QR">`;
            } else {
              elContentHtml = `<img src="${qrDataUrl}" class="canvas-image" style="object-fit: contain;" alt="Código QR">`;
            }
          } catch {
            elContentHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;">QR Code</div>`;
          }
        } else {
          elContentHtml = `<div style="width:100%;height:100%;background-color:${style.backgroundColor || 'transparent'};border:${style.borderWidth || 0}px solid ${style.borderColor || 'transparent'};border-radius:${style.borderRadius || 0}px;padding:${style.padding || 0}px;"></div>`;
        }

        const transformCss = el.rotation ? `transform: rotate(${el.rotation}deg);` : '';
        renderedElementsHtml.push(`
          <div class="canvas-element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; z-index: ${el.zIndex || 1}; ${transformCss}">
            ${elContentHtml}
          </div>
        `);
      }

      bodyInnerHtml = renderedElementsHtml.join('\n');
    }

    const pageBg = page.backgroundColor || canvasDoc.backgroundColor || '#ffffff';
    const fullHtml = buildFullHtmlPage(
      pageTitle,
      effectiveWidth,
      effectiveHeight,
      pageBg,
      bodyInnerHtml,
      options,
      pageFilesManifest,
      manifestItem.filename
    );

    zip.file(manifestItem.filename, fullHtml);
    exportedFilenames.push(manifestItem.filename);
  }

  onProgress?.({ percent: 75, statusText: 'Generando metadatos y documentación...' });

  // 4. Add data/data.json
  if (options.includeDataJson) {
    const dataJson = {
      manifest: {
        title: docTitle,
        author: options.author || 'Canvas Designer',
        exportedAt: new Date().toISOString(),
        dimensions: { width: effectiveWidth, height: effectiveHeight },
        pagesCount: pagesToProcess.length,
        version: '1.0'
      },
      document: {
        id: canvasDoc.id,
        name: canvasDoc.name,
        width: canvasDoc.width,
        height: canvasDoc.height,
        pages: pagesToProcess.map((p) => ({
          name: p.page.name,
          elementsCount: p.page.elements?.length || 0,
          elements: p.page.elements
        }))
      },
      datasets: dbRecords
    };
    dataFolder.file('data.json', JSON.stringify(dataJson, null, 2));
  }

  // 5. Add README.md
  if (options.includeReadme) {
    const readmeContent = generateReadme(canvasDoc, options, exportedFilenames);
    zip.file('README.md', readmeContent);
  }

  onProgress?.({ percent: 90, statusText: 'Empaquetando archivo ZIP comprimido...' });

  // Generate ZIP Blob
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.({
        percent: Math.round(90 + metadata.percent * 0.1),
        statusText: `Comprimiendo archivos (${Math.round(metadata.percent)}%)...`
      });
    }
  );

  onProgress?.({ percent: 100, statusText: '¡Empaquetado completado con éxito!' });

  return blob;
}

/**
 * Triggers client-side browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
