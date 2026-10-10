import { CanvasDocument, CanvasElement, CanvasPage } from '../types';
import { evaluateTemplate, calculateAggregation, formatChartData } from './dataBindingEvaluator';
import { evaluateMultiSeriesChartData } from './seriesChartEvaluator';
import { executeQuery } from './queryEngine';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderDesignOptions {
  scale?: number;
  showBanner?: boolean;
  bannerSubtitle?: string;
  activePageIndex?: number;
  showPageTabs?: boolean;
  tabsPosition?: 'bottom' | 'top';
  cleanEmbed?: boolean;
}

/**
 * Generates a self-contained, beautifully rendered HTML document from a CanvasDocument,
 * allowing it to be safely embedded and viewed inside an iframe via srcDoc.
 * Fully supports multi-page designs with interactive page switching and tabs.
 */
export function renderDesignToHtml(
  doc: CanvasDocument,
  dbRecords: Record<string, Record<string, any>[]> = {},
  options?: RenderDesignOptions
): string {
  const showBanner = options?.showBanner === true;
  const cleanEmbed = options?.cleanEmbed === true;
  const docName = escapeHtml(doc.name || 'Diseño de Base de Datos');
  const docBg = doc.backgroundColor || '#ffffff';

  // Normalize pages array
  const pages: CanvasPage[] = (doc.pages && doc.pages.length > 0)
    ? doc.pages
    : [
        {
          id: 'page_default_1',
          name: 'Página 1',
          elements: doc.elements || [],
          backgroundColor: doc.backgroundColor,
          width: doc.width,
          height: doc.height
        }
      ];

  const hasMultiplePages = pages.length > 1;
  const initialPageIndex = Math.min(
    Math.max(0, options?.activePageIndex ?? doc.activePageIndex ?? 0),
    pages.length - 1
  );
  const showTabs = options?.showPageTabs === true && (doc.showPageTabs !== false);
  const tabsPosition = options?.tabsPosition || doc.pageTabsPosition || 'bottom';

  // Total elements count across all pages
  const totalElementsCount = pages.reduce((sum, p) => sum + (p.elements?.length || 0), 0) || (doc.elements?.length || 0);

  // Render individual canvas pages into positioned HTML boards
  const renderedPagesHtml = pages.map((page, idx) => {
    const pageElements = (page.elements && page.elements.length > 0)
      ? [...page.elements]
      : (idx === 0 ? [...(doc.elements || [])] : []);

    const sorted = pageElements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const elementsHtml = sorted
      .filter(el => el.visible !== false)
      .map(el => renderElementHtml(el, dbRecords))
      .join('\n');

    const pageBg = page.backgroundColor || docBg;
    const pageWidth = page.width || doc.width || 1200;
    const pageHeight = page.height || doc.height || 800;
    const isDisplay = idx === initialPageIndex;

    return `
      <div
        class="canvas-board page-board"
        id="page-board-${idx}"
        data-page-index="${idx}"
        data-original-width="${pageWidth}"
        data-original-height="${pageHeight}"
        style="display: ${isDisplay ? 'block' : 'none'}; width: ${pageWidth}px; min-height: ${pageHeight}px; background-color: ${pageBg};"
      >
        ${elementsHtml || '<div style="padding: 60px; text-align: center; color: #94a3b8; font-size: 13px;">Esta página no tiene elementos aún.</div>'}
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docName}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: ${cleanEmbed ? 'hidden !important' : 'auto'};
      box-sizing: border-box;
      background-color: ${cleanEmbed ? docBg : '#f1f5f9'};
      color: #0f172a;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
      ${cleanEmbed ? 'scrollbar-width: none !important; -ms-overflow-style: none !important;' : 'scrollbar-width: thin; scrollbar-color: #94a3b8 #f1f5f9;'}
    }
    ${cleanEmbed ? `
    * {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    *::-webkit-scrollbar,
    ::-webkit-scrollbar {
      display: none !important;
      width: 0px !important;
      height: 0px !important;
    }
    ` : `
    /* Modern, responsive visible scrollbars */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f5f9;
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 5px;
      border: 2px solid #f1f5f9;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
    `}
    .design-banner {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #1e293b;
      color: #f8fafc;
      padding: 6px 14px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      border-bottom: 1px solid #334155;
      font-family: monospace;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .design-banner .badge {
      background: #10b981;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 9px;
      letter-spacing: 0.5px;
      margin-right: 8px;
    }
    .scale-mode-btn {
      background: transparent;
      color: #94a3b8;
      border: none;
      padding: 2px 7px;
      border-radius: 3px;
      font-size: 10px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .scale-mode-btn:hover {
      color: #ffffff;
    }
    .scale-mode-btn.active {
      background: #4f46e5;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .fullscreen-toggle-btn {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .fullscreen-toggle-btn:hover {
      background: #475569;
      color: #ffffff;
      border-color: #64748b;
    }
    .page-tabs-bar {
      position: sticky;
      z-index: 9990;
      background: #1e293b;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      user-select: none;
    }
    .page-tabs-bar.bottom-position {
      bottom: 0;
      border-top: 1px solid #334155;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
    }
    .page-tabs-bar.top-position {
      top: 31px;
      border-bottom: 1px solid #334155;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }
    .page-tabs-container {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: thin;
      flex: 1;
      padding-bottom: 1px;
    }
    .page-tabs-label {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      margin-right: 2px;
    }
    .page-tabs-list {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .page-tab-btn {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .page-tab-btn:hover {
      background: #475569;
      color: #ffffff;
      border-color: #64748b;
    }
    .page-tab-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #818cf8;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      font-weight: 600;
    }
    .page-tab-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .page-tab-btn.active .page-tab-dot {
      background: #a5b4fc;
    }
    .page-tab-count {
      background: rgba(0, 0, 0, 0.28);
      color: #e2e8f0;
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 9px;
      font-family: monospace;
    }
    .page-nav-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #cbd5e1;
      font-size: 11px;
      white-space: nowrap;
      flex-shrink: 0;
      font-family: monospace;
    }
    .page-nav-arrow {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 4px;
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
      transition: background 0.15s;
    }
    .page-nav-arrow:hover {
      background: #475569;
      color: #ffffff;
    }
    .canvas-viewport {
      padding: ${cleanEmbed ? '0 !important' : '16px'};
      margin: 0;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      min-width: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: ${cleanEmbed ? 'flex-start' : 'center'};
      justify-content: flex-start;
      overflow: ${cleanEmbed ? 'hidden !important' : 'auto'};
      background-color: ${cleanEmbed ? docBg : 'transparent'};
      transition: all 0.2s ease;
    }
    .canvas-board {
      position: relative;
      border-radius: ${cleanEmbed ? '0 !important' : '8px'};
      box-shadow: ${cleanEmbed ? 'none !important' : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'};
      border: ${cleanEmbed ? 'none !important' : '1px solid #cbd5e1'};
      overflow: hidden;
      transform-origin: top left;
      transition: transform 0.2s ease-out, margin-bottom 0.2s ease-out;
      margin: ${cleanEmbed ? '0 !important' : '0 auto'};
    }
    .table-container {
      width: 100%;
      height: 100%;
      overflow: ${cleanEmbed ? 'hidden !important' : 'auto'};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      text-align: left;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 180px;
    }
    tr:hover td {
      background: #f8fafc;
    }
    .kpi-wrapper {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      color: #0f172a;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  ${showBanner ? `
  <div class="design-banner">
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
      <span class="badge">DEXIE DB</span>
      <strong style="color: #ffffff;">${docName}</strong>
      <span style="color: #94a3b8; margin-left: 4px;">(${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} • ${totalElementsCount} elem. • ${doc.width}x${doc.height}px)</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
      <div style="display: inline-flex; align-items: center; gap: 2px; background: #334155; padding: 2px 4px; border-radius: 4px;">
        <button
          type="button"
          id="btn-scale-responsive"
          class="scale-mode-btn active"
          onclick="setScaleMode('responsive')"
          title="Ajustar responsivamente al ancho disponible"
        >
          📐 Auto-Ajustar
        </button>
        <button
          type="button"
          id="btn-scale-original"
          class="scale-mode-btn"
          onclick="setScaleMode('original')"
          title="Ver en tamaño original 100% con barras de desplazamiento"
        >
          100% Real
        </button>
      </div>
      <button
        type="button"
        class="fullscreen-toggle-btn"
        onclick="toggleParentFullscreen()"
        title="Alternar Pantalla Completa"
      >
        ⛶ Pantalla Completa
      </button>
    </div>
  </div>` : ''}

  ${hasMultiplePages && showTabs && tabsPosition === 'top' ? `
  <div class="page-tabs-bar top-position" id="page-tabs-bar">
    <div class="page-tabs-container">
      <div class="page-tabs-label">
        <span>📑 Hojas (${pages.length}):</span>
      </div>
      <div class="page-tabs-list" id="page-tabs-list">
        ${pages.map((p, idx) => `
          <button
            type="button"
            class="page-tab-btn ${idx === initialPageIndex ? 'active' : ''}"
            onclick="switchDocPage(${idx})"
            data-page-index="${idx}"
            title="${escapeHtml(p.name || `Página ${idx + 1}`)} (${(p.elements || []).length} elementos)"
          >
            <span class="page-tab-dot"></span>
            <span class="page-tab-text">${escapeHtml(p.name || `Página ${idx + 1}`)}</span>
            <span class="page-tab-count">${(p.elements || []).length}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="page-nav-controls">
      <button type="button" class="page-nav-arrow" onclick="prevDocPage()" title="Página anterior">◀</button>
      <span id="page-status-label">Pág. ${initialPageIndex + 1}/${pages.length}</span>
      <button type="button" class="page-nav-arrow" onclick="nextDocPage()" title="Página siguiente">▶</button>
    </div>
  </div>` : ''}

  <div class="canvas-viewport" id="canvas-viewport">
    ${renderedPagesHtml}
  </div>

  ${hasMultiplePages && showTabs && tabsPosition === 'bottom' ? `
  <div class="page-tabs-bar bottom-position" id="page-tabs-bar">
    <div class="page-tabs-container">
      <div class="page-tabs-label">
        <span>📑 Hojas (${pages.length}):</span>
      </div>
      <div class="page-tabs-list" id="page-tabs-list">
        ${pages.map((p, idx) => `
          <button
            type="button"
            class="page-tab-btn ${idx === initialPageIndex ? 'active' : ''}"
            onclick="switchDocPage(${idx})"
            data-page-index="${idx}"
            title="${escapeHtml(p.name || `Página ${idx + 1}`)} (${(p.elements || []).length} elementos)"
          >
            <span class="page-tab-dot"></span>
            <span class="page-tab-text">${escapeHtml(p.name || `Página ${idx + 1}`)}</span>
            <span class="page-tab-count">${(p.elements || []).length}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="page-nav-controls">
      <button type="button" class="page-nav-arrow" onclick="prevDocPage()" title="Página anterior">◀</button>
      <span id="page-status-label">Pág. ${initialPageIndex + 1}/${pages.length}</span>
      <button type="button" class="page-nav-arrow" onclick="nextDocPage()" title="Página siguiente">▶</button>
    </div>
  </div>` : ''}

  <script>
    var currentDocPageIndex = ${initialPageIndex};
    var totalDocPages = ${pages.length};

    function switchDocPage(idx) {
      if (idx < 0 || idx >= totalDocPages) return;
      currentDocPageIndex = idx;
      for (var i = 0; i < totalDocPages; i++) {
        var board = document.getElementById('page-board-' + i);
        if (board) {
          board.style.display = (i === idx) ? 'block' : 'none';
        }
      }
      var tabBtns = document.querySelectorAll('.page-tab-btn');
      tabBtns.forEach(function(btn, i) {
        var btnIdx = parseInt(btn.getAttribute('data-page-index') || '-1', 10);
        if (btnIdx === idx) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      var statusLabels = document.querySelectorAll('#page-status-label');
      statusLabels.forEach(function(label) {
        label.innerText = 'Pág. ' + (idx + 1) + '/' + totalDocPages;
      });
      try {
        window.parent.postMessage({ type: 'MINIBROWSER_PAGE_SWITCH', pageIndex: idx }, '*');
      } catch (e) {}
    }

    function prevDocPage() {
      if (currentDocPageIndex > 0) switchDocPage(currentDocPageIndex - 1);
    }

    function nextDocPage() {
      if (currentDocPageIndex < totalDocPages - 1) switchDocPage(currentDocPageIndex + 1);
    }

    var currentScaleMode = 'responsive';

    function updateBoardScale() {
      ${cleanEmbed ? 'return;' : `
      var viewport = document.getElementById('canvas-viewport');
      if (!viewport) return;
      var availW = Math.max(160, window.innerWidth - 32);
      var availH = Math.max(160, window.innerHeight - 32);
      var boards = document.querySelectorAll('.canvas-board');
      
      boards.forEach(function(board) {
        var origW = parseFloat(board.getAttribute('data-original-width')) || 1200;
        var origH = parseFloat(board.getAttribute('data-original-height')) || 800;
        
        if (currentScaleMode === 'responsive') {
          var scale = Math.min(availW / origW, 1);
          if (scale < 0.999) {
            board.style.transform = 'scale(' + scale + ')';
            board.style.transformOrigin = 'top center';
            board.style.marginBottom = '-' + Math.round(origH * (1 - scale)) + 'px';
          } else {
            board.style.transform = 'none';
            board.style.marginBottom = '0';
          }
        } else {
          board.style.transform = 'none';
          board.style.marginBottom = '0';
        }
      });
      `}
    }

    function setScaleMode(mode) {
      currentScaleMode = mode;
      var btnResp = document.getElementById('btn-scale-responsive');
      var btnOrig = document.getElementById('btn-scale-original');
      if (btnResp) btnResp.className = 'scale-mode-btn' + (mode === 'responsive' ? ' active' : '');
      if (btnOrig) btnOrig.className = 'scale-mode-btn' + (mode === 'original' ? ' active' : '');
      updateBoardScale();
    }

    function toggleParentFullscreen() {
      try {
        window.parent.postMessage({ type: 'MINIBROWSER_TOGGLE_FULLSCREEN' }, '*');
      } catch (e) {}
    }

    window.addEventListener('resize', updateBoardScale);
    window.addEventListener('load', updateBoardScale);
    setTimeout(updateBoardScale, 50);

    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'MINIBROWSER_SET_PAGE' && typeof event.data.pageIndex === 'number') {
        switchDocPage(event.data.pageIndex);
      }
      if (event.data && event.data.type === 'MINIBROWSER_SET_SCALE_MODE' && typeof event.data.mode === 'string') {
        setScaleMode(event.data.mode);
      }
    });
  </script>
</body>
</html>`;
}

function renderElementHtml(
  el: CanvasElement,
  dbRecords: Record<string, Record<string, any>[]>
): string {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.width || 100;
  const h = el.height || 60;
  const z = el.zIndex || 1;
  const st = el.style || {};
  const b = el.binding || {};

  const tableName = b.tableName || '';
  const records = dbRecords[tableName] || [];
  const firstRecord = records[0] || {};

  // Construct element style string
  const borderRule = st.borderWidth
    ? `border: ${st.borderWidth}px ${st.borderStyle || 'solid'} ${st.borderColor || '#cbd5e1'};`
    : (st.borderColor ? `border: 1px solid ${st.borderColor};` : '');

  const shadowRule = st.shadow && st.shadow !== 'none'
    ? 'box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05);'
    : '';

  const commonStyle = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    width: ${w}px;
    height: ${h}px;
    z-index: ${z};
    background-color: ${st.backgroundColor || 'transparent'};
    color: ${st.color || '#1e293b'};
    ${borderRule}
    border-radius: ${st.borderRadius || 0}px;
    ${shadowRule}
    padding: ${st.padding ?? 8}px;
    font-size: ${st.fontSize || 14}px;
    font-weight: ${st.fontWeight || 'normal'};
    text-align: ${st.textAlign || 'left'};
    font-family: ${st.fontFamily || 'inherit'};
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `.replace(/\s+/g, ' ').trim();

  let innerContent = '';

  switch (el.type) {
    case 'text': {
      const rawText = b.template || el.name || 'Texto';
      const evaluated = evaluateTemplate(rawText, firstRecord);
      innerContent = `<div style="width: 100%; height: 100%; display: flex; align-items: center; word-break: break-word;">${escapeHtml(evaluated)}</div>`;
      break;
    }

    case 'kpi': {
      const agg = calculateAggregation(records, b.field, b.aggregation);
      const valStr = `${b.prefix || ''}${agg.formatted}${b.suffix || ''}`;
      const label = b.template || b.field || el.name || 'Métrica';
      innerContent = `
        <div class="kpi-wrapper">
          <div class="kpi-value">${escapeHtml(valStr)}</div>
          <div class="kpi-label">${escapeHtml(label)}</div>
        </div>
      `;
      break;
    }

    case 'table': {
      const cols = b.columns && b.columns.length > 0
        ? b.columns
        : (records[0] ? Object.keys(records[0]).slice(0, 5) : ['id', 'nombre', 'valor']);
      const limit = b.limit || 8;
      const displayRows = records.slice(0, limit);

      innerContent = `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                ${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${displayRows.length > 0
                ? displayRows.map(r => `
                  <tr>
                    ${cols.map(c => `<td>${escapeHtml(r[c] !== undefined ? String(r[c]) : '-')}</td>`).join('')}
                  </tr>
                `).join('')
                : `<tr><td colspan="${cols.length}" style="text-align: center; color: #94a3b8; padding: 16px;">Sin datos</td></tr>`
              }
            </tbody>
          </table>
        </div>
      `;
      break;
    }

    case 'queryTable': {
      const rawSql = b.querySql || 'SELECT * FROM ventas LIMIT 50';
      const params = b.queryParams || [];
      const res = executeQuery(rawSql, params, dbRecords);
      const cols = res.columns && res.columns.length > 0
        ? res.columns
        : (res.rows[0] ? Object.keys(res.rows[0]) : ['id', 'columna']);
      const limit = b.limit || 15;
      const displayRows = res.rows.slice(0, limit);

      innerContent = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif;">
          <div style="padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; font-size: 11px; flex-shrink: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: #0f172a; font-size: 12px;">${escapeHtml(el.name || 'QueryTable')}</span>
              <span style="background: #e0e7ff; color: #4338ca; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-family: monospace; font-weight: 600;">SQL</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 10px; color: #059669; font-weight: 600; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px;">
                ${res.rowCount} filas (${res.durationMs || 0} ms)
              </span>
            </div>
          </div>
          <div class="table-container" style="flex: 1; overflow: auto; width: 100%;">
            <table>
              <thead>
                <tr>
                  ${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${displayRows.length > 0
                  ? displayRows.map(r => `
                    <tr>
                      ${cols.map(c => `<td>${escapeHtml(r[c] !== undefined ? String(r[c]) : '-')}</td>`).join('')}
                    </tr>
                  `).join('')
                  : `<tr><td colspan="${cols.length}" style="text-align: center; color: #94a3b8; padding: 16px;">Sin resultados</td></tr>`
                }
              </tbody>
            </table>
          </div>
          <div style="padding: 4px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; flex-shrink: 0;">
            <span>Mostrando ${displayRows.length} de ${res.rowCount} filas</span>
            <span style="font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(rawSql)}
            </span>
          </div>
        </div>
      `;
      break;
    }

    case 'chart': {
      if (b.chartType === 'series') {
        const seriesData = evaluateMultiSeriesChartData(records, {
          timeField: b.timeField || b.labelField,
          valueField: b.valueField,
          seriesField: b.seriesField,
          seriesAggregation: b.seriesAggregation || 'sum',
          timeSortOrder: b.timeSortOrder || 'asc',
          limit: b.limit || 12
        });

        const yRange = Math.max(seriesData.maxValue - seriesData.minValue, 1);
        const w = el.width || 360;
        const h = el.height || 200;
        const padL = 36;
        const padR = 16;
        const padT = 12;
        const padB = 24;
        const plotW = Math.max(w - padL - padR, 40);
        const plotH = Math.max(h - 60 - padT - padB, 40);

        const getX = (idx: number) => {
          if (seriesData.timePoints.length <= 1) return padL + plotW / 2;
          return padL + (idx / (seriesData.timePoints.length - 1)) * plotW;
        };

        const getY = (val: number | null) => {
          if (val === null || isNaN(val)) return null;
          return padT + plotH - ((val - seriesData.minValue) / yRange) * plotH;
        };

        innerContent = `
          <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between; overflow: hidden; font-family: system-ui, sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: #1e293b;">
                ${escapeHtml(b.template || el.name || 'Series Temporales')}
              </span>
              <span style="font-size: 9px; font-weight: 600; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px;">
                ${seriesData.series.length} ${seriesData.series.length === 1 ? 'serie' : 'series'}
              </span>
            </div>
            ${b.showSeriesLegend !== false ? `
              <div style="display: flex; gap: 8px; overflow-x: auto; margin-bottom: 4px; padding-bottom: 2px;">
                ${seriesData.series.map(s => `
                  <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 9999px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${s.color}; display: inline-block;"></span>
                    ${escapeHtml(s.name)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
            <div style="flex: 1; position: relative;">
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h - 55}" style="overflow: visible;">
                ${seriesData.series.map(s => {
                  const pts: string[] = [];
                  s.points.forEach((p, idx) => {
                    const y = getY(p.value);
                    if (y !== null) {
                      pts.push(`${getX(idx)},${y}`);
                    }
                  });
                  if (pts.length === 0) return '';
                  return `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}" />`;
                }).join('')}
                ${seriesData.timePoints.map((tp, idx) => {
                  const x = getX(idx);
                  return `<text x="${x}" y="${padT + plotH + 12}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(tp.length > 10 ? tp.slice(5) : tp)}</text>`;
                }).join('')}
              </svg>
            </div>
          </div>
        `;
        break;
      }

      const chartData = formatChartData(records, b.labelField, b.valueField);
      const items = chartData.slice(0, 6);
      const maxVal = Math.max(...items.map(i => i.value), 1);

      innerContent = `
        <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            ${escapeHtml(b.template || el.name || 'Gráfico')}
          </div>
          <div style="flex: 1; display: flex; align-items: flex-end; gap: 8px; padding-bottom: 4px;">
            ${items.length > 0 ? items.map(item => {
              const hPct = Math.max(10, Math.min(100, Math.round((item.value / maxVal) * 100)));
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;">
                  <div style="width: 100%; height: ${hPct}%; background: linear-gradient(180deg, #6366f1, #4f46e5); border-radius: 4px 4px 0 0;" title="${escapeHtml(item.label)}: ${item.value}"></div>
                  <span style="font-size: 9px; color: #64748b; margin-top: 4px; max-width: 40px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.label)}</span>
                </div>
              `;
            }).join('') : '<div style="color: #94a3b8; font-size: 11px; margin: auto;">Sin datos para graficar</div>'}
          </div>
        </div>
      `;
      break;
    }

    case 'badge': {
      const text = b.template || el.name || 'Badge';
      innerContent = `
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
          <span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
            ${escapeHtml(text)}
          </span>
        </div>
      `;
      break;
    }

    case 'image': {
      const src = b.imageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80';
      innerContent = `<img src="${escapeHtml(src)}" alt="${escapeHtml(el.name)}" style="width: 100%; height: 100%; object-fit: ${b.imageFit || 'cover'}; border-radius: inherit;" />`;
      break;
    }

    case 'qrcode': {
      const text = b.template || 'https://dexie.org';
      innerContent = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 4px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#0f172a">
            <path d="M2 2h7v7H2V2zm2 2v3h3V4H4zm11-2h7v7h-7V2zm2 2v3h3V4h-3zM2 15h7v7H2v-7zm2 2v3h3v-3H4zm9-2h2v2h-2v-2zm4 0h3v2h-3v-2zm-4 4h2v3h-2v-3zm3 1h2v2h-2v-2zm2-1h2v3h-2v-3zm-9-8h2v2h-2V6zm3 0h2v2h-2V6zm2 2h2v2h-2V8zm-5 2h2v2h-2v-2zm4 0h2v2h-2v-2zm2 2h2v2h-2v-2z" />
          </svg>
          <span style="font-size: 9px; color: #64748b; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(text)}</span>
        </div>
      `;
      break;
    }

    case 'divider': {
      innerContent = `<hr style="border: 0; border-top: 1px solid ${st.borderColor || '#cbd5e1'}; width: 100%; margin: auto 0;" />`;
      break;
    }

    case 'drilldown': {
      const levels = b.drillLevels || ['categoria', 'nombre'];
      const valField = b.valueField || 'precio';
      innerContent = `
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>${escapeHtml(b.template || 'Desglose Jerárquico')}</span>
            <span style="font-size: 9px; background: #e0e7ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px;">Nivel: ${escapeHtml(levels[0] || '1')}</span>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: auto;">
            ${records.slice(0, 4).map((r, idx) => {
              const label = String(r[levels[0]] || `Elemento ${idx + 1}`);
              const val = r[valField] !== undefined ? r[valField] : (idx + 1) * 25;
              return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; display: flex; justify-content: space-between; font-size: 11px;">
                  <span style="font-weight: 600; color: #1e293b;">${escapeHtml(label)}</span>
                  <span style="color: #6366f1; font-weight: 700;">${escapeHtml(String(val))}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      break;
    }

    case 'detailCard': {
      const title = String((b.headerField && firstRecord[b.headerField] !== undefined) ? firstRecord[b.headerField] : (firstRecord.nombre || el.name || 'Ficha Detalle'));
      const subtitle = String((b.subHeaderField && firstRecord[b.subHeaderField] !== undefined) ? firstRecord[b.subHeaderField] : '');
      const cols = Array.isArray(b.columns) ? b.columns : [];

      innerContent = `
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${escapeHtml(title)}</div>
            ${subtitle ? `<div style="font-size: 10px; color: #64748b;">${escapeHtml(subtitle)}</div>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            ${cols.length > 0 ? cols.slice(0, 6).map(col => `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-size: 10px; text-transform: uppercase;">${escapeHtml(col)}:</span>
                <strong style="color: #1e293b;">${escapeHtml(String(firstRecord[col] ?? '-'))}</strong>
              </div>
            `).join('') : '<div style="color: #94a3b8; font-style: italic; font-size: 10px;">Sin campos configurados</div>'}
          </div>
        </div>
      `;
      break;
    }

    case 'matrix': {
      const rowLevels = Array.isArray(b.rowFields) && b.rowFields.length > 0 ? b.rowFields : [b.rowField || 'Categoría'];
      const colLevels = Array.isArray(b.colFields) && b.colFields.length > 0 ? b.colFields : [b.colField || 'Período'];
      innerContent = `
        <div style="display: flex; flex-direction: column; height: 100%; font-size: 11px; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px;">
            <div style="font-weight: 700; color: #1e293b;">${escapeHtml(b.template || 'Matriz Bidimensional')}</div>
            <div style="font-size: 9px; font-family: monospace; color: #0284c7; background: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">
              ${escapeHtml(rowLevels.join(' › '))} × ${escapeHtml(colLevels.join(' › '))}
            </div>
          </div>
          <div style="flex: 1; overflow: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #f1f5f9; color: #475569; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 4px 6px; text-align: left; font-weight: 700;">${escapeHtml(rowLevels.join(' / '))}</th>
                  <th style="padding: 4px 6px; text-align: center; font-weight: 700;">Nivel A</th>
                  <th style="padding: 4px 6px; text-align: center; font-weight: 700;">Nivel B</th>
                  <th style="padding: 4px 6px; text-align: right; font-weight: 700;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 6px; font-weight: 600; color: #334155;">▪ Grupo 1</td>
                  <td style="padding: 4px 6px; text-align: center; font-family: monospace; background: rgba(59, 130, 246, 0.1);">120</td>
                  <td style="padding: 4px 6px; text-align: center; font-family: monospace; background: rgba(59, 130, 246, 0.2);">240</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 700; color: #1d4ed8;">360</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 6px; padding-left: 14px; color: #64748b;">↳ Sub-item</td>
                  <td style="padding: 4px 6px; text-align: center; font-family: monospace; background: rgba(59, 130, 246, 0.05);">50</td>
                  <td style="padding: 4px 6px; text-align: center; font-family: monospace; background: rgba(59, 130, 246, 0.12);">110</td>
                  <td style="padding: 4px 6px; text-align: right; font-weight: 700; color: #1d4ed8;">160</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      break;
    }

    case 'form': {
      innerContent = `
        <div style="display: flex; flex-direction: column; gap: 6px; height: 100%;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">${escapeHtml(b.template || 'Formulario')}</div>
          <input type="text" placeholder="Nombre..." style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px;" readonly />
          <input type="text" placeholder="Valor / Importe..." style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px;" readonly />
          <button style="margin-top: auto; background: #6366f1; color: #ffffff; border: 0; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
            ${escapeHtml(b.prefix || 'Guardar Registro')}
          </button>
        </div>
      `;
      break;
    }

    case 'filter': {
      const field = b.field || 'categoria';
      innerContent = `
        <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; font-size: 11px; padding: 4px;">
          <span style="color: #64748b; font-weight: 600;">Filtro: ${escapeHtml(field)}</span>
          <span style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; color: #334155;">Todos ▾</span>
        </div>
      `;
      break;
    }

    case 'minibrowser': {
      const showTitle = b.browserShowTitleBar ?? true;
      const showToolbar = b.browserShowToolBar ?? true;
      const showTabs = b.browserShowTabsBar ?? true;
      const showFooter = b.browserShowFooter ?? true;
      const url = b.browserUrl || 'https://example.com';
      const isLib = url.toLowerCase().startsWith('lib://') || url.toLowerCase().startsWith('library://');
      const isDb = url.toLowerCase().startsWith('db://') && !isLib;

      let titleHtml = '';
      if (showTitle) {
        titleHtml = `
          <div style="height: 26px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; flex-shrink: 0; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #f87171; display: inline-block;"></span>
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; display: inline-block;"></span>
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
              <span style="font-weight: 600; color: #475569; margin-left: 6px; font-size: 11px;">${escapeHtml(isLib ? url.replace(/^lib(rary)?:\/\//i, '') : isDb ? url.replace(/^db:\/\//i, '') : url.replace(/^https?:\/\//i, '').split('/')[0])}</span>
            </div>
            <span style="font-size: 9px; padding: 1px 6px; border-radius: 4px; background: ${isLib ? '#e0e7ff; color: #4338ca' : isDb ? '#dcfce7; color: #15803d' : '#e0f2fe; color: #0369a1'}; font-weight: 600;">${isLib ? 'LIBRARY' : isDb ? 'DB DESIGN' : 'WEB'}</span>
          </div>
        `;
      }

      let toolbarHtml = '';
      if (showToolbar) {
        toolbarHtml = `
          <div style="height: 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; flex-shrink: 0; box-sizing: border-box;">
            <span style="color: #94a3b8; font-size: 11px; user-select: none;">◀ ▶ ↻</span>
            <div style="flex: 1; height: 20px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 6px; display: flex; align-items: center; font-size: 10px; color: #334155; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(url)}
            </div>
          </div>
        `;
      }

      let tabsHtml = '';
      if (showTabs && isDb) {
        tabsHtml = `
          <div style="height: 28px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 0 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; flex-shrink: 0; box-sizing: border-box;">
            <span style="color: #6366f1; font-weight: 600; font-size: 10px;">📑 Páginas:</span>
            <span style="background: #ffffff; color: #4338ca; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">Página 1</span>
          </div>
        `;
      }

      let footerHtml = '';
      if (showFooter) {
        footerHtml = `
          <div style="height: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; flex-shrink: 0; box-sizing: border-box;">
            <span style="font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${escapeHtml(url)}</span>
            <span>100%</span>
          </div>
        `;
      }

      const contentHtml = isDb
        ? `<div style="display: flex; flex-direction: column; height: 100%; align-items: center; justify-content: center; color: #64748b; font-size: 11px; background: #f8fafc;"><span>📊 ${escapeHtml(url)}</span></div>`
        : `<iframe src="${escapeHtml(url)}" style="width: 100%; height: 100%; border: 0; display: block;" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" scrolling="auto"></iframe>`;

      innerContent = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; background: #ffffff;">
          ${titleHtml}
          ${toolbarHtml}
          ${tabsHtml}
          <div style="flex: 1; width: 100%; min-height: 0; position: relative; overflow: hidden;">
            ${contentHtml}
          </div>
          ${footerHtml}
        </div>
      `;
      break;
    }

    case 'splitPanel': {
      const orientation = b.splitOrientation || 'vertical';
      const slots = b.splitSlots || {};
      const ratio = b.splitRatio ?? 0.5;
      const ratioH = b.splitRatioH ?? 0.5;
      const ratioV = b.splitRatioV ?? 0.5;

      const renderSlotHtml = (slotKey: string, title: string) => {
        const items = slots[slotKey] || [];
        if (items.length === 0) {
          return `<div style="flex: 1; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 6px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px;">${title}</div>`;
        }
        return `
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 6px; overflow: auto; background: #f8fafc;">
            ${items.map((it: any) => `
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; font-size: 11px;">
                <strong>${escapeHtml(it.name || it.type)}</strong>
              </div>
            `).join('')}
          </div>
        `;
      };

      if (orientation === 'vertical') {
        const leftP = Math.round(ratio * 100);
        const rightP = 100 - leftP;
        innerContent = `
          <div style="display: flex; flex-direction: row; width: 100%; height: 100%;">
            <div style="width: ${leftP}%; height: 100%; overflow: hidden; display: flex;">
              ${renderSlotHtml('panel-1', 'Panel Izquierdo')}
            </div>
            <div style="width: 4px; height: 100%; background: #cbd5e1;"></div>
            <div style="width: ${rightP}%; height: 100%; overflow: hidden; display: flex;">
              ${renderSlotHtml('panel-2', 'Panel Derecho')}
            </div>
          </div>
        `;
      } else if (orientation === 'horizontal') {
        const topP = Math.round(ratio * 100);
        const botP = 100 - topP;
        innerContent = `
          <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
            <div style="height: ${topP}%; width: 100%; overflow: hidden; display: flex;">
              ${renderSlotHtml('panel-1', 'Panel Superior')}
            </div>
            <div style="height: 4px; width: 100%; background: #cbd5e1;"></div>
            <div style="height: ${botP}%; width: 100%; overflow: hidden; display: flex;">
              ${renderSlotHtml('panel-2', 'Panel Inferior')}
            </div>
          </div>
        `;
      } else {
        const leftP = Math.round(ratioV * 100);
        const rightP = 100 - leftP;
        const topP = Math.round(ratioH * 100);
        const botP = 100 - topP;
        innerContent = `
          <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
            <div style="display: flex; flex-direction: row; height: ${topP}%; width: 100%;">
              <div style="width: ${leftP}%; height: 100%; display: flex;">${renderSlotHtml('panel-1', 'Sup. Izq.')}</div>
              <div style="width: 4px; height: 100%; background: #cbd5e1;"></div>
              <div style="width: ${rightP}%; height: 100%; display: flex;">${renderSlotHtml('panel-2', 'Sup. Der.')}</div>
            </div>
            <div style="height: 4px; width: 100%; background: #cbd5e1;"></div>
            <div style="display: flex; flex-direction: row; height: ${botP}%; width: 100%;">
              <div style="width: ${leftP}%; height: 100%; display: flex;">${renderSlotHtml('panel-3', 'Inf. Izq.')}</div>
              <div style="width: 4px; height: 100%; background: #cbd5e1;"></div>
              <div style="width: ${rightP}%; height: 100%; display: flex;">${renderSlotHtml('panel-4', 'Inf. Der.')}</div>
            </div>
          </div>
        `;
      }
      break;
    }

    default: {
      innerContent = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; color: #64748b;">${escapeHtml(el.name || el.type)}</div>`;
      break;
    }
  }

  return `<div id="el-${el.id}" style="${commonStyle}">${innerContent}</div>`;
}
