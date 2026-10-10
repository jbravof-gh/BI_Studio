import { LibraryRoot, LibraryFileNode } from '../types';
import {
  normalizePath,
  getParentPath,
  getFileExtension,
  getMimeType,
  resolveRelativePath,
  flattenTreeFiles,
  findNodeByPath
} from '../services/dbLibraryService';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Resolves CSS url(...) references relative to the CSS file's directory.
 */
function resolveCssUrls(
  cssContent: string,
  cssDir: string,
  fileMap: Map<string, LibraryFileNode>
): string {
  if (!cssContent) return '';
  return cssContent.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote, relUrl) => {
    const trimmed = relUrl.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('#')) {
      return match;
    }
    const resolvedPath = resolveRelativePath(cssDir, trimmed);
    const targetFile = fileMap.get(resolvedPath);
    if (targetFile && targetFile.content) {
      return `url("${targetFile.content}")`;
    }
    return match;
  });
}

/**
 * Generates an interactive Directory Index page when browsing a folder.
 */
function renderDirectoryIndexHtml(
  root: LibraryRoot,
  folderNode: LibraryFileNode,
  currentPath: string
): string {
  const normPath = normalizePath(currentPath);
  const isAtRoot = normPath === '/';
  const parentPath = getParentPath(normPath);
  const children = folderNode.children || [];

  const folders = children.filter(c => c.type === 'folder');
  const files = children.filter(c => c.type === 'file');

  // Breadcrumbs
  const pathParts = normPath.split('/').filter(Boolean);
  let breadcrumbHtml = `<a href="javascript:void(0)" onclick="window.parent.postMessage({type:'MINIBROWSER_NAVIGATE', url:'lib://${root.name}/'}, '*')" style="color:#6366f1; text-decoration:none; font-weight:700;">${escapeHtml(root.name)}</a>`;
  let accum = '';
  for (let i = 0; i < pathParts.length; i++) {
    accum += '/' + pathParts[i];
    const p = accum;
    breadcrumbHtml += ` <span style="color:#94a3b8;">/</span> <a href="javascript:void(0)" onclick="window.parent.postMessage({type:'MINIBROWSER_NAVIGATE', url:'lib://${root.name}${p}'}, '*')" style="color:#6366f1; text-decoration:none;">${escapeHtml(pathParts[i])}</a>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Directorio: ${escapeHtml(root.name)}${escapeHtml(normPath)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
    .header {
      padding: 16px 20px;
      background: #182234;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .breadcrumbs {
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      font-family: monospace;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #0f172a;
      color: #94a3b8;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #334155;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      color: #cbd5e1;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }
    .item-link {
      color: #f1f5f9;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .item-link:hover {
      color: #818cf8;
      text-decoration: underline;
    }
    .folder-icon { color: #f59e0b; font-size: 15px; }
    .file-icon { color: #94a3b8; font-size: 15px; }
    .meta-text {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="breadcrumbs">
        <span style="font-size: 16px;">📁</span>
        ${breadcrumbHtml}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge">BD: ${escapeHtml(root.dbName)}</span>
        <span class="badge">${children.length} elemento(s)</span>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th style="width: 120px;">Tipo</th>
            <th style="width: 100px; text-align: right;">Tamaño</th>
            <th style="width: 160px; text-align: right;">Modificado</th>
          </tr>
        </thead>
        <tbody>
          ${!isAtRoot ? `
            <tr>
              <td colspan="4">
                <a href="javascript:void(0)" onclick="window.parent.postMessage({type:'MINIBROWSER_NAVIGATE', url:'lib://${root.name}${parentPath}'}, '*')" class="item-link" style="color:#94a3b8;">
                  <span>📁</span> <strong>.. (Carpeta superior)</strong>
                </a>
              </td>
            </tr>
          ` : ''}

          ${folders.map(f => `
            <tr>
              <td>
                <a href="javascript:void(0)" onclick="window.parent.postMessage({type:'MINIBROWSER_NAVIGATE', url:'lib://${root.name}${f.path}'}, '*')" class="item-link">
                  <span class="folder-icon">📁</span>
                  <strong>${escapeHtml(f.name)}/</strong>
                </a>
              </td>
              <td><span class="badge" style="background:#312e81; color:#a5b4fc;">Carpeta</span></td>
              <td style="text-align: right;" class="meta-text">${f.children ? f.children.length : 0} items</td>
              <td style="text-align: right;" class="meta-text">${new Date(f.lastModified).toLocaleDateString()}</td>
            </tr>
          `).join('')}

          ${files.map(f => {
            const ext = getFileExtension(f.name);
            let icon = '📄';
            let badgeBg = '#1e293b';
            let badgeColor = '#94a3b8';
            if (ext === 'pdf') { icon = '📑'; badgeBg = '#881337'; badgeColor = '#fda4af'; }
            else if (['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext)) { icon = '📊'; badgeBg = '#064e3b'; badgeColor = '#6ee7b7'; }
            else if (['docx', 'doc', 'dotx'].includes(ext)) { icon = '📝'; badgeBg = '#1e3a8a'; badgeColor = '#93c5fd'; }
            else if (ext === 'msg') { icon = '✉️'; badgeBg = '#1e3a8a'; badgeColor = '#93c5fd'; }
            else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) { icon = '🖼️'; badgeBg = '#4c1d95'; badgeColor = '#c4b5fd'; }
            else if (['html', 'htm'].includes(ext)) { icon = '🌐'; badgeBg = '#312e81'; badgeColor = '#a5b4fc'; }
            else if (ext === 'json') { icon = '🧩'; badgeBg = '#0f766e'; badgeColor = '#5eead4'; }
            else if (ext === 'css') { icon = '🎨'; badgeBg = '#0369a1'; badgeColor = '#7dd3fc'; }
            else if (['js', 'mjs', 'ts'].includes(ext)) { icon = '⚡'; badgeBg = '#713f12'; badgeColor = '#fde047'; }
            return `
            <tr>
              <td>
                <a href="javascript:void(0)" onclick="window.parent.postMessage({type:'MINIBROWSER_NAVIGATE', url:'lib://${root.name}${f.path}'}, '*')" class="item-link">
                  <span class="file-icon">${icon}</span>
                  <span>${escapeHtml(f.name)}</span>
                </a>
              </td>
              <td><span class="badge" style="background:${badgeBg}; color:${badgeColor};">${escapeHtml(ext.toUpperCase() || 'ARCHIVO')}</span></td>
              <td style="text-align: right;" class="meta-text">${formatBytes(f.size || 0)}</td>
              <td style="text-align: right;" class="meta-text">${new Date(f.lastModified).toLocaleDateString()}</td>
            </tr>
          `;
          }).join('')}

          ${children.length === 0 ? `
            <tr>
              <td colspan="4">
                <div class="empty-state">
                  <p style="font-size: 15px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Esta carpeta está vacía</p>
                  <p style="font-size: 12px; color: #64748b;">Puedes añadir archivos o carpetas desde el Gestor de Base de Datos &rarr; pestaña Library.</p>
                </div>
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Resolves all relative references inside an HTML file (CSS, JS, images, links)
 * taking into account the file's location in the tree structure.
 */
function resolveHtmlDocument(
  htmlContent: string,
  filePath: string,
  root: LibraryRoot,
  fileMap: Map<string, LibraryFileNode>
): string {
  const currentDir = getParentPath(filePath);

  // Script to intercept in-page navigation and notify MiniBrowser
  const navigationInterceptor = `
  <script>
    (function() {
      document.addEventListener('click', function(e) {
        var target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        if (target && target.tagName === 'A') {
          var href = target.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
              e.preventDefault();
              var resolved = target.getAttribute('data-resolved-lib-url');
              if (resolved) {
                window.parent.postMessage({ type: 'MINIBROWSER_NAVIGATE', url: resolved }, '*');
              }
            }
          }
        }
      }, true);
    })();
  </script>
  `;

  let processed = htmlContent;

  // 1. Resolve <link rel="stylesheet" href="...">
  processed = processed.replace(/<link\b([^>]*?)href=(['"])([^'"]+?)\2([^>]*?)>/gi, (match, prefix, quote, href, suffix) => {
    const isStylesheet = /rel=(['"]?)stylesheet\1/i.test(match);
    if (!isStylesheet) return match;

    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:')) {
      return match;
    }

    const resolvedPath = resolveRelativePath(currentDir, href);
    const cssNode = fileMap.get(resolvedPath);
    if (cssNode && cssNode.content) {
      const cssDir = getParentPath(resolvedPath);
      const resolvedCss = resolveCssUrls(cssNode.content, cssDir, fileMap);
      return `<style data-source="${escapeHtml(resolvedPath)}">\n${resolvedCss}\n</style>`;
    }

    return match;
  });

  // 2. Resolve <script src="...">
  processed = processed.replace(/<script\b([^>]*?)src=(['"])([^'"]+?)\2([^>]*?)>(?:<\/script>)?/gi, (match, prefix, quote, src, suffix) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return match;
    }

    const resolvedPath = resolveRelativePath(currentDir, src);
    const jsNode = fileMap.get(resolvedPath);
    if (jsNode && jsNode.content) {
      return `<script data-source="${escapeHtml(resolvedPath)}">\n${jsNode.content}\n</script>`;
    }

    return match;
  });

  // 3. Resolve <img src="...">, <source src="...">, <video src="...">, <audio src="...">
  processed = processed.replace(/<(img|source|video|audio|embed)\b([^>]*?)src=(['"])([^'"]+?)\3([^>]*?)>/gi, (match, tag, prefix, quote, src, suffix) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
      return match;
    }

    const resolvedPath = resolveRelativePath(currentDir, src);
    const mediaNode = fileMap.get(resolvedPath);
    if (mediaNode && mediaNode.content) {
      return `<${tag}${prefix}src="${mediaNode.content}"${suffix}>`;
    }

    return match;
  });

  // 4. Resolve inline url(...) in <style> blocks
  processed = processed.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, styleBody) => {
    const resolvedBody = resolveCssUrls(styleBody, currentDir, fileMap);
    return `<style${attrs}>${resolvedBody}</style>`;
  });

  // 5. Resolve <a href="..."> for relative in-tree links
  processed = processed.replace(/<a\b([^>]*?)href=(['"])([^'"]+?)\2([^>]*?)>/gi, (match, prefix, quote, href, suffix) => {
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#') || href.startsWith('javascript:')) {
      return match;
    }

    const resolvedPath = resolveRelativePath(currentDir, href);
    const targetLibUrl = `lib://${root.name}${resolvedPath}`;

    return `<a${prefix}href="${escapeHtml(href)}" data-resolved-lib-url="${escapeHtml(targetLibUrl)}"${suffix}>`;
  });

  // Inject the navigation interceptor before </body> or at the end
  if (processed.includes('</body>')) {
    processed = processed.replace('</body>', `${navigationInterceptor}\n</body>`);
  } else {
    processed += navigationInterceptor;
  }

  return processed;
}

/**
 * Main function that resolves and renders any file or folder from a LibraryRoot.
 */
export function renderLibraryTargetToHtml(
  root: LibraryRoot,
  rawTargetPath: string
): { html: string; title: string; contentType: string } {
  const fileMap = flattenTreeFiles(root.tree);
  let targetPath = normalizePath(rawTargetPath || '/');

  // If path is root or a directory, check for index.html
  let targetNode = fileMap.get(targetPath);

  if (!targetNode && !targetPath.endsWith('/')) {
    // Check if target is a folder without trailing slash
    targetNode = fileMap.get(targetPath);
  }

  // If node is a folder:
  if (!targetNode || targetNode.type === 'folder') {
    const folderNode = targetNode || root.tree;
    // Check if folder contains index.html
    const indexPath = normalizePath(`${targetPath}/index.html`);
    const indexNode = fileMap.get(indexPath);
    if (indexNode && indexNode.type === 'file' && indexNode.content) {
      return {
        html: resolveHtmlDocument(indexNode.content, indexPath, root, fileMap),
        title: `${root.name} - index.html`,
        contentType: 'text/html'
      };
    }

    // Otherwise, render directory index
    return {
      html: renderDirectoryIndexHtml(root, folderNode, targetPath),
      title: `Librería: ${root.name}${targetPath}`,
      contentType: 'text/html'
    };
  }

  // Node is a file!
  const ext = getFileExtension(targetNode.name);

  // 1. HTML file
  if (ext === 'html' || ext === 'htm') {
    return {
      html: resolveHtmlDocument(targetNode.content || '', targetPath, root, fileMap),
      title: targetNode.name,
      contentType: 'text/html'
    };
  }

  // 2. PDF Document
  if (ext === 'pdf' || targetNode.mimeType === 'application/pdf') {
    return {
      html: renderPdfViewerHtml(targetNode.name, targetNode.content || '', targetNode.size),
      title: targetNode.name,
      contentType: 'application/pdf'
    };
  }

  // 3. Excel Spreadsheet (.xlsx, .xls, .csv, .ods, .tsv)
  if (
    ['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext) ||
    targetNode.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    targetNode.mimeType === 'application/vnd.ms-excel' ||
    targetNode.mimeType === 'text/csv' ||
    targetNode.mimeType === 'text/tab-separated-values' ||
    targetNode.mimeType === 'application/vnd.oasis.opendocument.spreadsheet'
  ) {
    return {
      html: renderExcelViewerHtml(targetNode.name, targetNode.content || '', targetNode.size),
      title: targetNode.name,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  // 4. Word Document (.docx, .doc, .dotx)
  if (
    ['docx', 'doc', 'dotx'].includes(ext) ||
    targetNode.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    targetNode.mimeType === 'application/msword'
  ) {
    return {
      html: renderWordViewerHtml(targetNode.name, targetNode.content || '', targetNode.size),
      title: targetNode.name,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  // 5. Outlook Message (.msg)
  if (
    ext === 'msg' ||
    targetNode.mimeType === 'application/vnd.ms-outlook' ||
    targetNode.mimeType === 'application/x-msg'
  ) {
    return {
      html: renderMsgViewerHtml(targetNode.name, targetNode.content || '', targetNode.size),
      title: targetNode.name,
      contentType: 'application/vnd.ms-outlook'
    };
  }

  // 3. Image file
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
    const imgSrc = targetNode.content || '';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(targetNode.name)}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #94a3b8;
      font-family: sans-serif;
    }
    .preview-box {
      background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    img {
      max-width: 90vw;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 4px;
    }
    .meta {
      margin-top: 16px;
      font-size: 12px;
      font-family: monospace;
      color: #cbd5e1;
      display: flex;
      gap: 16px;
    }
  </style>
</head>
<body>
  <div class="preview-box">
    <img src="${imgSrc}" alt="${escapeHtml(targetNode.name)}" />
  </div>
  <div class="meta">
    <span>${escapeHtml(targetNode.name)}</span>
    <span>${formatBytes(targetNode.size)}</span>
    <span>${targetNode.mimeType}</span>
  </div>
</body>
</html>`;
    return { html, title: targetNode.name, contentType: targetNode.mimeType };
  }

function parseInlineMd(text: string): string {
  let res = escapeHtml(text);
  // Bold **text**
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff; font-weight:700;">$1</strong>');
  // Italic *text*
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code `code`
  res = res.replace(/`([^`]+)`/g, '<code style="background:#0f172a; border:1px solid #334155; border-radius:4px; padding:2px 6px; font-family:monospace; font-size:12px; color:#a5b4fc;">$1</code>');
  // Link [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#818cf8; text-decoration:underline;">$1</a>');
  return res;
}

function renderMarkdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.split(/\r?\n/);
  let html = '';
  let inCodeBlock = false;
  let codeContent = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:14px; overflow-x:auto; margin-bottom:16px; font-family:monospace; font-size:13px; color:#e2e8f0;"><code>${escapeHtml(codeContent)}</code></pre>`;
        inCodeBlock = false;
        codeContent = '';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        inCodeBlock = true;
        codeContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+(.*)/.test(line)) {
      const itemText = line.replace(/^\s*[-*+]\s+/, '');
      if (!inList) {
        html += '<ul style="margin-bottom:16px; padding-left:24px; color:#cbd5e1; list-style-type:disc;">';
        inList = true;
      }
      html += `<li style="margin-bottom:6px;">${parseInlineMd(itemText)}</li>`;
      continue;
    } else if (inList) {
      html += '</ul>';
      inList = false;
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1 style="font-size:24px; font-weight:800; color:#ffffff; margin:24px 0 12px 0; border-bottom:1px solid #334155; padding-bottom:8px;">${parseInlineMd(line.substring(2))}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2 style="font-size:20px; font-weight:700; color:#e0e7ff; margin:20px 0 10px 0; border-bottom:1px solid #334155; padding-bottom:6px;">${parseInlineMd(line.substring(3))}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3 style="font-size:16px; font-weight:600; color:#c7d2fe; margin:16px 0 8px 0;">${parseInlineMd(line.substring(4))}</h3>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      html += `<blockquote style="border-left:4px solid #6366f1; padding:8px 16px; background:rgba(99,102,241,0.1); color:#cbd5e1; margin:12px 0; border-radius:0 8px 8px 0; font-style:italic;">${parseInlineMd(line.substring(2))}</blockquote>`;
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      html += '<hr style="border:none; border-top:1px solid #334155; margin:20px 0;">';
      continue;
    }

    // Paragraph
    if (line.trim() === '') {
      html += '<div style="height:10px;"></div>';
    } else {
      html += `<p style="margin-bottom:12px; color:#cbd5e1; line-height:1.6;">${parseInlineMd(line)}</p>`;
    }
  }

  if (inCodeBlock) {
    html += `<pre style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:14px; overflow-x:auto; margin-bottom:16px; font-family:monospace; font-size:13px; color:#e2e8f0;"><code>${escapeHtml(codeContent)}</code></pre>`;
  }
  if (inList) {
    html += '</ul>';
  }

  return html;
}

  // 3. Markdown file
  if (ext === 'md' || ext === 'markdown') {
    const rawContent = targetNode.content || '';
    const renderedBody = renderMarkdownToHtml(rawContent);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(targetNode.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      padding: 32px 20px;
      line-height: 1.6;
    }
    .markdown-container {
      max-width: 800px;
      margin: 0 auto;
      background: #1e293b;
      padding: 36px;
      border-radius: 14px;
      border: 1px solid #334155;
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.4);
    }
    .file-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      border-bottom: 1px solid #334155;
      padding-bottom: 14px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: #312e81;
      color: #a5b4fc;
      border: 1px solid #4338ca;
    }
  </style>
</head>
<body>
  <div class="markdown-container">
    <div class="file-header">
      <h2 style="font-size: 18px; font-weight: 700; color: #818cf8; display: flex; align-items: center; gap: 8px;">
        📄 ${escapeHtml(targetNode.name)}
      </h2>
      <span class="badge">Markdown Renderizado</span>
    </div>
    ${renderedBody || '<p style="color:#64748b; font-style:italic;">Documento vacío</p>'}
  </div>
</body>
</html>`;
    return { html, title: targetNode.name, contentType: 'text/html' };
  }

  // 4. JSON file
  if (ext === 'json') {
    let prettyJson = '';
    let isValid = true;
    try {
      const parsed = JSON.parse(targetNode.content || '{}');
      prettyJson = JSON.stringify(parsed, null, 2);
    } catch {
      isValid = false;
      prettyJson = targetNode.content || '';
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(targetNode.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0;
      padding: 24px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .json-card {
      max-width: 900px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
    .file-bar {
      background: #141f32;
      border-bottom: 1px solid #334155;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 12px;
    }
    .status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-ok { background: #064e3b; color: #34d399; }
    .status-err { background: #881337; color: #fda4af; }
    pre {
      margin: 0;
      padding: 20px;
      background: #0f172a;
      overflow: auto;
      max-height: calc(100vh - 120px);
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="json-card">
    <div class="file-bar">
      <span>${escapeHtml(targetNode.name)}</span>
      <span class="status ${isValid ? 'status-ok' : 'status-err'}">${isValid ? '✓ JSON Válido' : '✕ Error de Sintaxis JSON'}</span>
    </div>
    <pre><code>${escapeHtml(prettyJson)}</code></pre>
  </div>
</body>
</html>`;
    return { html, title: targetNode.name, contentType: 'text/html' };
  }

  // 5. CSS file preview sandbox
  if (ext === 'css') {
    const rawCss = targetNode.content || '';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CSS Preview: ${escapeHtml(targetNode.name)}</title>
  <style>
    /* Injected CSS from file */
    ${rawCss}
  </style>
  <style>
    /* Sandbox container styles */
    .css-sandbox-body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 24px;
      margin: 0;
    }
    .sandbox-container {
      max-width: 840px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
    }
    .sandbox-header {
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sandbox-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body class="css-sandbox-body">
  <div class="sandbox-container">
    <div class="sandbox-header">
      <h2 style="font-size:16px; color:#38bdf8;">🎨 Previsualización CSS: ${escapeHtml(targetNode.name)}</h2>
      <span style="font-size:11px; background:#0369a1; color:#e0f2fe; padding:2px 8px; border-radius:4px;">Hoja de Estilos Activa</span>
    </div>

    <div class="sandbox-section">
      <div class="section-title">Tipografía y Encabezados</div>
      <h1>Encabezado Principal H1</h1>
      <p style="margin: 8px 0;">Este es un párrafo de texto normal que adopta las reglas CSS definidas en <strong>${escapeHtml(targetNode.name)}</strong>.</p>
      <a href="#" style="margin-right: 12px;">Enlace de ejemplo</a>
    </div>

    <div class="sandbox-section">
      <div class="section-title">Botones y Elementos Interactivos</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="btn btn-primary" type="button" style="cursor:pointer;">Botón Primario</button>
        <button class="btn btn-secondary" type="button" style="cursor:pointer;">Botón Secundario</button>
        <button type="button" style="cursor:pointer;">Botón Estándar</button>
      </div>
    </div>

    <div class="sandbox-section">
      <div class="section-title">Formularios e Inputs</div>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <input type="text" placeholder="Campo de texto..." style="padding:6px 10px; border-radius:4px;" />
        <select style="padding:6px 10px; border-radius:4px;">
          <option>Opción 1</option>
          <option>Opción 2</option>
        </select>
      </div>
    </div>
  </div>
</body>
</html>`;
    return { html, title: targetNode.name, contentType: 'text/html' };
  }

  // 6. Code / Text file fallback
  const textContent = escapeHtml(targetNode.content || '');
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(targetNode.name)}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .file-bar {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 8px 16px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 12px;
    }
    pre {
      margin: 0;
      background: #111827;
      border: 1px solid #334155;
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 16px;
      overflow: auto;
      max-height: calc(100vh - 100px);
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="file-bar">
    <span>${escapeHtml(targetNode.name)}</span>
    <span>${formatBytes(targetNode.size)}</span>
  </div>
  <pre><code>${textContent}</code></pre>
</body>
</html>`;
  return { html, title: targetNode.name, contentType: 'text/html' };
}

/**
 * Generates an interactive, responsive HTML5 PDF viewer powered by PDF.js with Native browser fallback.
 */
function renderPdfViewerHtml(fileName: string, pdfContent: string, fileSize?: number): string {
  const safeName = escapeHtml(fileName);
  const formattedSize = formatBytes(fileSize || 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #0b0f19;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Toolbar */
    .pdf-toolbar {
      height: 48px;
      min-height: 48px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 8px;
      user-select: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .toolbar-left, .toolbar-center, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .doc-badge {
      background: #e11d48;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    .doc-title {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .doc-size {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    
    .divider {
      width: 1px;
      height: 20px;
      background: #334155;
      margin: 0 4px;
    }
    
    .btn {
      background: #334155;
      color: #e2e8f0;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover:not(:disabled) {
      background: #475569;
      color: #ffffff;
      border-color: #64748b;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn.primary {
      background: #4f46e5;
      border-color: #6366f1;
      color: #ffffff;
    }
    .btn.primary:hover:not(:disabled) {
      background: #4338ca;
    }
    
    .page-input-box {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #94a3b8;
    }
    .page-input-box input {
      width: 38px;
      height: 24px;
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #ffffff;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      outline: none;
    }
    .page-input-box input:focus {
      border-color: #6366f1;
    }
    
    .zoom-text {
      font-size: 11px;
      color: #cbd5e1;
      font-family: monospace;
      min-width: 40px;
      text-align: center;
    }

    /* Main Viewport Container */
    .pdf-viewport {
      flex: 1;
      width: 100%;
      height: calc(100% - 48px);
      overflow: auto;
      background: #0b0f19;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(11, 15, 25, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 20;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .pdf-page-container {
      margin-bottom: 24px;
      position: relative;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .pdf-page-container canvas {
      display: block;
      max-width: 100%;
    }
    .page-indicator-badge {
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #64748b;
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    #native-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: none;
      background: #0b0f19;
    }
    
    /* Error Banner */
    .error-container {
      padding: 30px;
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #e11d48;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .error-container h3 {
      color: #f43f5e;
      font-size: 15px;
      margin-bottom: 8px;
    }
    .error-container p {
      color: #94a3b8;
      font-size: 12px;
      margin-bottom: 16px;
    }

    @media print {
      .pdf-toolbar, .loading-overlay { display: none !important; }
      body, .pdf-viewport { background: transparent !important; padding: 0 !important; overflow: visible !important; }
      .pdf-page-container { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
    }
  </style>
</head>
<body>
  <!-- Top Navigation & Control Toolbar -->
  <div class="pdf-toolbar">
    <div class="toolbar-left">
      <span class="doc-badge">PDF</span>
      <span class="doc-title" title="${safeName}">${safeName}</span>
      ${formattedSize ? `<span class="doc-size">(${formattedSize})</span>` : ''}
    </div>
    
    <div class="toolbar-center" id="canvas-controls">
      <button type="button" class="btn" id="prev-page" title="Página Anterior (Flecha Izq)">◀</button>
      <div class="page-input-box">
        <input type="number" id="current-page-num" value="1" min="1" max="1" />
        <span>/</span>
        <span id="page-count-val">1</span>
      </div>
      <button type="button" class="btn" id="next-page" title="Página Siguiente (Flecha Der)">▶</button>
      
      <div class="divider"></div>
      
      <button type="button" class="btn" id="zoom-out" title="Reducir Zoom (−)">−</button>
      <span class="zoom-text" id="zoom-label">100%</span>
      <button type="button" class="btn" id="zoom-in" title="Aumentar Zoom (+)">+</button>
      <button type="button" class="btn" id="fit-width" title="Ajustar al Ancho">Ajustar</button>
      <button type="button" class="btn" id="rotate-cw" title="Rotar 90°">↻</button>
    </div>
    
    <div class="toolbar-right">
      <button type="button" class="btn" id="mode-toggle" title="Alternar entre Página Individual y Continuo">
        <span id="mode-label">Todas las Páginas</span>
      </button>
      <button type="button" class="btn" id="view-mode-toggle" title="Alternar entre visor Canvas y visor nativo del navegador">
        ⚡ Nativo
      </button>
      <button type="button" class="btn primary" id="download-btn" title="Descargar PDF">⬇ Descargar</button>
    </div>
  </div>

  <!-- Document Viewport -->
  <div class="pdf-viewport" id="viewport">
    <div class="loading-overlay" id="loading">
      <div class="spinner"></div>
      <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">Cargando documento PDF...</div>
    </div>
    
    <div id="pages-wrapper" style="display: flex; flex-direction: column; align-items: center; width: 100%;"></div>
    <iframe id="native-frame" title="Visor Nativo"></iframe>
  </div>

  <script>
    (function() {
      var rawData = ${JSON.stringify(pdfContent)};
      var fileName = ${JSON.stringify(fileName)};
      var pdfDoc = null;
      var currentPage = 1;
      var totalPages = 1;
      var currentScale = 1.0;
      var currentRotation = 0;
      var isContinuous = true;
      var activeViewMode = 'canvas'; // 'canvas' | 'native'
      var cachedBlobUrl = null;

      function getPdfBytes() {
        if (!rawData) return null;
        try {
          var clean = rawData.trim();
          if (clean.indexOf('data:') === 0) {
            var parts = clean.split(',');
            var base64Str = parts[1] || '';
            var binary = atob(base64Str.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          } else if (clean.indexOf('%PDF-') === 0) {
            var len = clean.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = clean.charCodeAt(i) & 0xff;
            }
            return bytes;
          } else if (/^[A-Za-z0-9+/=\\r\\n]+$/.test(clean) && clean.length > 50) {
            var binary = atob(clean.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          }
        } catch (e) {
          console.warn('[PDF Viewer] Byte conversion fallback:', e);
        }
        return rawData;
      }

      function getBlobUrl() {
        if (cachedBlobUrl) return cachedBlobUrl;
        var bytes = getPdfBytes();
        var blob;
        if (bytes instanceof Uint8Array) {
          blob = new Blob([bytes], { type: 'application/pdf' });
        } else {
          blob = new Blob([rawData], { type: 'application/pdf' });
        }
        cachedBlobUrl = URL.createObjectURL(blob);
        return cachedBlobUrl;
      }

      function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function() { cb(null); };
        s.onerror = function(err) { cb(err); };
        document.head.appendChild(s);
      }

      function ensurePdfJs(callback) {
        if (typeof window.pdfjsLib !== 'undefined') {
          callback();
          return;
        }
        loadScript('/vendor/pdf.min.js', function(err) {
          if (typeof window.pdfjsLib !== 'undefined') {
            callback();
          } else {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', function() {
              if (typeof window.pdfjsLib !== 'undefined') {
                callback();
              } else {
                switchToNative();
              }
            });
          }
        });
      }

      function switchToNative() {
        activeViewMode = 'native';
        var loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        var wrapper = document.getElementById('pages-wrapper');
        if (wrapper) wrapper.style.display = 'none';
        var canvasControls = document.getElementById('canvas-controls');
        if (canvasControls) canvasControls.style.display = 'none';
        var modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) modeToggle.style.display = 'none';
        document.getElementById('view-mode-toggle').textContent = '📄 Canvas';

        var nativeFrame = document.getElementById('native-frame');
        nativeFrame.style.display = 'block';
        nativeFrame.src = getBlobUrl();
      }

      function switchToCanvas() {
        activeViewMode = 'canvas';
        var nativeFrame = document.getElementById('native-frame');
        nativeFrame.style.display = 'none';
        nativeFrame.src = '';
        var wrapper = document.getElementById('pages-wrapper');
        if (wrapper) wrapper.style.display = 'flex';
        var canvasControls = document.getElementById('canvas-controls');
        if (canvasControls) canvasControls.style.display = 'flex';
        var modeToggle = document.getElementById('mode-toggle');
        if (modeToggle) modeToggle.style.display = 'inline-flex';
        document.getElementById('view-mode-toggle').textContent = '⚡ Nativo';

        if (pdfDoc) {
          render();
        } else {
          ensurePdfJs(initViewer);
        }
      }

      function triggerDownload() {
        var url = getBlobUrl();
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      function updateControls() {
        document.getElementById('current-page-num').value = currentPage;
        document.getElementById('page-count-val').textContent = totalPages;
        document.getElementById('zoom-label').textContent = Math.round(currentScale * 100) + '%';
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
        document.getElementById('mode-label').textContent = isContinuous ? 'Todas las Páginas' : 'Pág. Individual';
      }

      function renderSinglePage(num) {
        if (!pdfDoc) return;
        var wrapper = document.getElementById('pages-wrapper');
        wrapper.innerHTML = '';
        
        pdfDoc.getPage(num).then(function(page) {
          var dpr = window.devicePixelRatio || 1;
          var viewport = page.getViewport({ scale: currentScale * dpr, rotation: currentRotation });
          
          var container = document.createElement('div');
          container.className = 'pdf-page-container';
          
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
          canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
          
          var badge = document.createElement('div');
          badge.className = 'page-indicator-badge';
          badge.textContent = 'Página ' + num + ' de ' + totalPages;
          
          container.appendChild(canvas);
          container.appendChild(badge);
          wrapper.appendChild(container);
          
          var renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };
          page.render(renderContext).promise.then(function() {
            var loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
          });
        });
      }

      function renderAllPages() {
        if (!pdfDoc) return;
        var wrapper = document.getElementById('pages-wrapper');
        wrapper.innerHTML = '';
        var dpr = window.devicePixelRatio || 1;
        
        var renderPageNum = function(n) {
          if (n > totalPages) {
            var loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
            return;
          }
          pdfDoc.getPage(n).then(function(page) {
            var viewport = page.getViewport({ scale: currentScale * dpr, rotation: currentRotation });
            
            var container = document.createElement('div');
            container.className = 'pdf-page-container';
            container.id = 'page-box-' + n;
            
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
            canvas.style.height = Math.floor(viewport.height / dpr) + 'px';
            
            var badge = document.createElement('div');
            badge.className = 'page-indicator-badge';
            badge.textContent = 'Página ' + n + ' de ' + totalPages;
            
            container.appendChild(canvas);
            container.appendChild(badge);
            wrapper.appendChild(container);
            
            var renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };
            page.render(renderContext).promise.then(function() {
              renderPageNum(n + 1);
            });
          }).catch(function(err) {
            console.warn('[PDF] Error rendering page ' + n, err);
            var loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
          });
        };
        
        renderPageNum(1);
      }

      function render() {
        updateControls();
        if (isContinuous) {
          renderAllPages();
        } else {
          renderSinglePage(currentPage);
        }
      }

      function fitToWidth() {
        if (!pdfDoc) return;
        pdfDoc.getPage(currentPage).then(function(page) {
          var viewportEl = document.getElementById('viewport');
          var availableWidth = viewportEl.clientWidth - 48;
          var unscaledViewport = page.getViewport({ scale: 1.0, rotation: currentRotation });
          var newScale = Math.max(0.3, Math.min(3.0, availableWidth / unscaledViewport.width));
          currentScale = Math.round(newScale * 10) / 10;
          render();
        });
      }

      function initViewer() {
        var bytes = getPdfBytes();
        if (!bytes) {
          switchToNative();
          return;
        }

        try {
          if (window.pdfjsLib) {
            try {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
            } catch(e) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = false;
            }
          }
        } catch (e) {}

        var loadingTask = window.pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        });

        loadingTask.promise.then(function(pdf) {
          pdfDoc = pdf;
          totalPages = pdf.numPages;
          currentPage = 1;
          document.getElementById('current-page-num').max = totalPages;
          
          pdf.getPage(1).then(function(firstPage) {
            var viewportEl = document.getElementById('viewport');
            var availableWidth = (viewportEl.clientWidth || 600) - 48;
            var unscaled = firstPage.getViewport({ scale: 1.0, rotation: 0 });
            var autoScale = Math.max(0.4, Math.min(1.5, availableWidth / unscaled.width));
            currentScale = Math.round(autoScale * 10) / 10;
            render();
          });
        }).catch(function(err) {
          console.warn('[PDF Viewer] PDF.js load error, falling back to native browser view:', err);
          switchToNative();
        });
      }

      document.getElementById('prev-page').onclick = function() {
        if (currentPage > 1) {
          currentPage--;
          if (isContinuous) {
            var target = document.getElementById('page-box-' + currentPage);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateControls();
          } else {
            render();
          }
        }
      };

      document.getElementById('next-page').onclick = function() {
        if (currentPage < totalPages) {
          currentPage++;
          if (isContinuous) {
            var target = document.getElementById('page-box-' + currentPage);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateControls();
          } else {
            render();
          }
        }
      };

      document.getElementById('current-page-num').onchange = function(e) {
        var num = parseInt(e.target.value, 10);
        if (num >= 1 && num <= totalPages) {
          currentPage = num;
          if (isContinuous) {
            var target = document.getElementById('page-box-' + currentPage);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            updateControls();
          } else {
            render();
          }
        } else {
          e.target.value = currentPage;
        }
      };

      document.getElementById('zoom-in').onclick = function() {
        currentScale = Math.min(3.0, Math.round((currentScale + 0.15) * 100) / 100);
        render();
      };

      document.getElementById('zoom-out').onclick = function() {
        currentScale = Math.max(0.3, Math.round((currentScale - 0.15) * 100) / 100);
        render();
      };

      document.getElementById('fit-width').onclick = fitToWidth;

      document.getElementById('rotate-cw').onclick = function() {
        currentRotation = (currentRotation + 90) % 360;
        render();
      };

      document.getElementById('mode-toggle').onclick = function() {
        isContinuous = !isContinuous;
        render();
      };

      document.getElementById('view-mode-toggle').onclick = function() {
        if (activeViewMode === 'canvas') {
          switchToNative();
        } else {
          switchToCanvas();
        }
      };

      document.getElementById('download-btn').onclick = triggerDownload;

      window.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          document.getElementById('next-page').click();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          document.getElementById('prev-page').click();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
          e.preventDefault();
          document.getElementById('zoom-in').click();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
          e.preventDefault();
          document.getElementById('zoom-out').click();
        }
      });

      document.getElementById('viewport').addEventListener('scroll', function() {
        if (!isContinuous || !pdfDoc) return;
        var viewportTop = this.scrollTop;
        for (var i = 1; i <= totalPages; i++) {
          var box = document.getElementById('page-box-' + i);
          if (box) {
            var boxTop = box.offsetTop - 60;
            var boxBottom = boxTop + box.offsetHeight;
            if (viewportTop >= boxTop && viewportTop < boxBottom) {
              if (currentPage !== i) {
                currentPage = i;
                document.getElementById('current-page-num').value = i;
                document.getElementById('prev-page').disabled = currentPage <= 1;
                document.getElementById('next-page').disabled = currentPage >= totalPages;
              }
              break;
            }
          }
        }
      });

      ensurePdfJs(initViewer);
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates an interactive, responsive Excel viewer with multiple sheet tabs, sticky headers and live search.
 */
function renderExcelViewerHtml(fileName: string, excelContent: string, fileSize?: number): string {
  const safeName = escapeHtml(fileName);
  const formattedSize = formatBytes(fileSize || 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #0b130e;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Toolbar */
    .excel-toolbar {
      height: 48px;
      min-height: 48px;
      background: #112217;
      border-bottom: 1px solid #1c3b28;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 8px;
      user-select: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .toolbar-left, .toolbar-center, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .doc-badge {
      background: #107c41;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    .doc-title {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .doc-size {
      font-size: 11px;
      color: #86efac;
      font-family: monospace;
    }
    
    .divider {
      width: 1px;
      height: 20px;
      background: #1c3b28;
      margin: 0 4px;
    }
    
    .btn {
      background: #1c3b28;
      color: #e2e8f0;
      border: 1px solid #2d5a3f;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover:not(:disabled) {
      background: #234d34;
      color: #ffffff;
      border-color: #3e7b57;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn.primary {
      background: #107c41;
      border-color: #15803d;
      color: #ffffff;
    }
    .btn.primary:hover:not(:disabled) {
      background: #059669;
    }
    
    .search-box {
      display: flex;
      align-items: center;
      background: #0a1710;
      border: 1px solid #1c3b28;
      border-radius: 6px;
      padding: 2px 8px;
      gap: 4px;
    }
    .search-box input {
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 11px;
      width: 130px;
    }
    .search-box input::placeholder {
      color: #6ee7b7;
      opacity: 0.6;
    }
    
    .zoom-text {
      font-size: 11px;
      color: #cbd5e1;
      font-family: monospace;
      min-width: 36px;
      text-align: center;
    }

    /* Main Viewport Container */
    .excel-viewport {
      flex: 1;
      width: 100%;
      height: calc(100% - 84px);
      overflow: auto;
      background: #0f172a;
      position: relative;
    }
    
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(11, 19, 14, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 20;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #1c3b28;
      border-top-color: #107c41;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Excel Grid Table */
    .sheet-table-wrapper {
      min-width: 100%;
      display: inline-block;
      vertical-align: top;
      background: #182234;
      transform-origin: top left;
      transition: transform 0.15s ease;
    }
    table.excel-grid {
      border-collapse: collapse;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #e2e8f0;
      table-layout: auto;
      min-width: 100%;
    }
    table.excel-grid th, table.excel-grid td {
      border: 1px solid #334155;
      padding: 6px 10px;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 320px;
      overflow: hidden;
    }
    table.excel-grid thead th {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #94a3b8;
      font-weight: 600;
      font-size: 11px;
      text-align: center;
      z-index: 5;
      box-shadow: inset 0 -1px 0 #475569;
    }
    table.excel-grid th.row-idx {
      position: sticky;
      left: 0;
      background: #1e293b;
      color: #94a3b8;
      font-weight: 600;
      font-size: 10px;
      text-align: center;
      min-width: 44px;
      width: 44px;
      z-index: 6;
      box-shadow: inset -1px 0 0 #475569;
    }
    table.excel-grid thead th.corner-header {
      position: sticky;
      top: 0;
      left: 0;
      z-index: 7;
      background: #0f172a;
      box-shadow: inset -1px -1px 0 #475569;
    }
    table.excel-grid tr:nth-child(even) td {
      background: #131c2d;
    }
    table.excel-grid tr:nth-child(odd) td {
      background: #182234;
    }
    table.excel-grid td:hover {
      background: #1e293b;
      outline: 2px solid #107c41;
      outline-offset: -2px;
      cursor: cell;
    }
    table.excel-grid tr.highlight-match td {
      background: rgba(16, 124, 65, 0.28) !important;
    }

    /* Bottom Sheet Tabs Bar */
    .sheet-tabs-bar {
      height: 36px;
      min-height: 36px;
      background: #111a14;
      border-top: 1px solid #1c3b28;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 8px;
      z-index: 10;
    }
    .sheet-tabs-list {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 2px 0;
    }
    .sheet-tabs-list::-webkit-scrollbar { display: none; }
    .sheet-tab {
      background: #16241a;
      border: 1px solid #23432e;
      border-bottom: none;
      color: #94a3b8;
      padding: 4px 12px;
      border-radius: 6px 6px 0 0;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .sheet-tab:hover {
      background: #1d3324;
      color: #ffffff;
    }
    .sheet-tab.active {
      background: #107c41;
      color: #ffffff;
      font-weight: 700;
      border-color: #15803d;
      box-shadow: 0 -2px 6px rgba(0,0,0,0.3);
    }
    .sheet-stats {
      font-size: 11px;
      color: #86efac;
      font-family: monospace;
      padding: 0 8px;
      white-space: nowrap;
    }

    .error-container {
      padding: 30px;
      max-width: 480px;
      margin: 40px auto;
      background: #1e293b;
      border: 1px solid #e11d48;
      border-radius: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="excel-toolbar">
    <div class="toolbar-left">
      <span class="doc-badge">EXCEL</span>
      <span class="doc-title" title="${safeName}">${safeName}</span>
      ${formattedSize ? `<span class="doc-size">(${formattedSize})</span>` : ''}
    </div>

    <div class="toolbar-center">
      <div class="search-box">
        <span>🔍</span>
        <input type="text" id="sheet-search" placeholder="Buscar en la hoja..." />
      </div>

      <div class="divider"></div>

      <button type="button" class="btn" id="zoom-out" title="Reducir Zoom (−)">−</button>
      <span class="zoom-text" id="zoom-label">100%</span>
      <button type="button" class="btn" id="zoom-in" title="Aumentar Zoom (+)">+</button>
      <button type="button" class="btn" id="zoom-reset" title="Restablecer 100%">100%</button>
    </div>

    <div class="toolbar-right">
      <button type="button" class="btn" id="copy-table-btn" title="Copiar datos visibles al portapapeles">📋 Copiar Datos</button>
      <button type="button" class="btn primary" id="download-btn" title="Descargar archivo">⬇ Descargar</button>
    </div>
  </div>

  <div class="excel-viewport" id="viewport">
    <div class="loading-overlay" id="loading">
      <div class="spinner"></div>
      <div style="font-size: 12px; color: #86efac; font-weight: 500;">Interpretando hoja de cálculo...</div>
    </div>
    <div id="table-container" class="sheet-table-wrapper"></div>
  </div>

  <div class="sheet-tabs-bar">
    <div class="sheet-tabs-list" id="tabs-list"></div>
    <div class="sheet-stats" id="sheet-stats">Cargando...</div>
  </div>

  <script>
    (function() {
      var rawData = ${JSON.stringify(excelContent)};
      var fileName = ${JSON.stringify(fileName)};
      var workbook = null;
      var currentSheetName = '';
      var currentZoom = 1.0;
      var searchQuery = '';
      var activeRowsData = [];

      function getExcelBytes() {
        if (!rawData) return null;
        try {
          var clean = rawData.trim();
          if (clean.indexOf('data:') === 0) {
            var parts = clean.split(',');
            var base64Str = parts[1] || '';
            var binary = atob(base64Str.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          } else if (/^[A-Za-z0-9+/=\\r\\n]+$/.test(clean) && clean.length > 50) {
            var binary = atob(clean.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          }
        } catch (e) {
          console.warn('[Excel] Byte extraction fallback:', e);
        }
        return rawData;
      }

      function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function() { cb(null); };
        s.onerror = function(err) { cb(err); };
        document.head.appendChild(s);
      }

      function ensureXlsx(callback) {
        if (typeof window.XLSX !== 'undefined') {
          callback();
          return;
        }
        loadScript('/vendor/xlsx.full.min.js', function() {
          if (typeof window.XLSX !== 'undefined') {
            callback();
          } else {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', function() {
              if (typeof window.XLSX !== 'undefined') {
                callback();
              } else {
                showError('No se pudo cargar el motor XLSX.');
              }
            });
          }
        });
      }

      function showError(msg) {
        var loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        var container = document.getElementById('table-container');
        container.innerHTML = [
          '<div class="error-container">',
          '  <h3 style="color:#f43f5e; margin-bottom:8px;">⚠️ Error al abrir Hoja de Cálculo</h3>',
          '  <p style="color:#94a3b8; font-size:12px; margin-bottom:16px;">' + (msg || 'No se pudo interpretar el archivo Excel.') + '</p>',
          '  <button type="button" class="btn primary" id="err-dl" style="padding:6px 14px;">⬇ Descargar Archivo</button>',
          '</div>'
        ].join('');
        document.getElementById('err-dl').onclick = triggerDownload;
      }

      function colIndexToName(idx) {
        var name = '';
        while (idx >= 0) {
          name = String.fromCharCode((idx % 26) + 65) + name;
          idx = Math.floor(idx / 26) - 1;
        }
        return name;
      }

      function renderCurrentSheet() {
        if (!workbook || !currentSheetName) return;
        var sheet = workbook.Sheets[currentSheetName];
        if (!sheet) return;

        var rawRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        activeRowsData = rawRows;

        var maxCols = 0;
        for (var i = 0; i < rawRows.length; i++) {
          if (rawRows[i].length > maxCols) maxCols = rawRows[i].length;
        }
        if (maxCols === 0) maxCols = 1;

        var filter = (searchQuery || '').toLowerCase();
        var html = '<table class="excel-grid"><thead><tr><th class="corner-header">#</th>';

        for (var c = 0; c < maxCols; c++) {
          html += '<th>' + colIndexToName(c) + '</th>';
        }
        html += '</tr></thead><tbody>';

        var renderedRowCount = 0;
        for (var r = 0; r < rawRows.length; r++) {
          var row = rawRows[r] || [];
          var rowText = row.join(' ').toLowerCase();
          var isMatch = filter ? (rowText.indexOf(filter) !== -1) : false;

          if (filter && !isMatch) continue;

          renderedRowCount++;
          html += '<tr class="' + (isMatch ? 'highlight-match' : '') + '">';
          html += '<th class="row-idx">' + (r + 1) + '</th>';

          for (var c = 0; c < maxCols; c++) {
            var val = (row[c] !== undefined && row[c] !== null) ? String(row[c]) : '';
            html += '<td title="' + val.replace(/"/g, '&quot;') + '">' + val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</td>';
          }
          html += '</tr>';
        }

        if (renderedRowCount === 0) {
          html += '<tr><td colspan="' + (maxCols + 1) + '" style="text-align:center; padding:32px; color:#94a3b8;">' +
            (filter ? 'No se encontraron coincidencias para la búsqueda.' : 'Esta hoja está vacía.') +
            '</td></tr>';
        }

        html += '</tbody></table>';

        var container = document.getElementById('table-container');
        container.innerHTML = html;

        var statsEl = document.getElementById('sheet-stats');
        statsEl.textContent = 'Hoja: ' + currentSheetName + ' | ' + maxCols + ' cols × ' + rawRows.length + ' filas' + (filter ? ' (' + renderedRowCount + ' visibles)' : '') + ' | ' + workbook.SheetNames.length + ' hoja(s)';

        var loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
      }

      function renderTabs() {
        if (!workbook) return;
        var tabsList = document.getElementById('tabs-list');
        tabsList.innerHTML = '';

        workbook.SheetNames.forEach(function(name) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sheet-tab' + (name === currentSheetName ? ' active' : '');
          btn.innerHTML = '📊 ' + name;
          btn.onclick = function() {
            currentSheetName = name;
            renderTabs();
            renderCurrentSheet();
          };
          tabsList.appendChild(btn);
        });
      }

      function triggerDownload() {
        var bytes = getExcelBytes();
        var blob;
        if (bytes instanceof Uint8Array) {
          blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        } else {
          blob = new Blob([rawData], { type: 'text/plain' });
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'libro.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
      }

      function initExcel() {
        var data = getExcelBytes();
        if (!data) {
          showError('El archivo de hoja de cálculo está vacío.');
          return;
        }

        try {
          var isBinary = data instanceof Uint8Array;
          workbook = window.XLSX.read(data, {
            type: isBinary ? 'array' : 'string',
            cellDates: true
          });

          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            showError('El archivo no contiene hojas válidas.');
            return;
          }

          currentSheetName = workbook.SheetNames[0];
          renderTabs();
          renderCurrentSheet();
        } catch (err) {
          console.error('[Excel Viewer] Parse error:', err);
          showError('Error al procesar el archivo Excel: ' + (err.message || 'Formato no reconocido.'));
        }
      }

      document.getElementById('sheet-search').oninput = function(e) {
        searchQuery = e.target.value;
        renderCurrentSheet();
      };

      document.getElementById('zoom-in').onclick = function() {
        currentZoom = Math.min(2.0, Math.round((currentZoom + 0.15) * 100) / 100);
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('table-container').style.transform = 'scale(' + currentZoom + ')';
      };

      document.getElementById('zoom-out').onclick = function() {
        currentZoom = Math.max(0.5, Math.round((currentZoom - 0.15) * 100) / 100);
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('table-container').style.transform = 'scale(' + currentZoom + ')';
      };

      document.getElementById('zoom-reset').onclick = function() {
        currentZoom = 1.0;
        document.getElementById('zoom-label').textContent = '100%';
        document.getElementById('table-container').style.transform = 'scale(1)';
      };

      document.getElementById('copy-table-btn').onclick = function() {
        if (!activeRowsData || activeRowsData.length === 0) return;
        var tsv = activeRowsData.map(function(r) { return r.join('\\t'); }).join('\\n');
        navigator.clipboard.writeText(tsv).then(function() {
          var btn = document.getElementById('copy-table-btn');
          var oldText = btn.textContent;
          btn.textContent = '✓ ¡Copiado!';
          setTimeout(function() { btn.textContent = oldText; }, 2000);
        });
      };

      document.getElementById('download-btn').onclick = triggerDownload;

      ensureXlsx(initExcel);
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates an interactive, responsive Word (.docx) document viewer powered by docx-preview & mammoth.js.
 */
function renderWordViewerHtml(fileName: string, wordContent: string, fileSize?: number): string {
  const safeName = escapeHtml(fileName);
  const formattedSize = formatBytes(fileSize || 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #0f172a;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Top Toolbar */
    .word-toolbar {
      height: 48px;
      min-height: 48px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 8px;
      user-select: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .toolbar-left, .toolbar-center, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .doc-badge {
      background: #2563eb;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    .doc-title {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .doc-size {
      font-size: 11px;
      color: #93c5fd;
      font-family: monospace;
    }
    
    .divider {
      width: 1px;
      height: 20px;
      background: #334155;
      margin: 0 4px;
    }
    
    .btn {
      background: #334155;
      color: #e2e8f0;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn:hover:not(:disabled) {
      background: #475569;
      color: #ffffff;
      border-color: #64748b;
    }
    .btn.primary {
      background: #2563eb;
      border-color: #3b82f6;
      color: #ffffff;
    }
    .btn.primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    
    .zoom-text {
      font-size: 11px;
      color: #cbd5e1;
      font-family: monospace;
      min-width: 36px;
      text-align: center;
    }

    /* Main Viewport Container */
    .word-viewport {
      flex: 1;
      width: 100%;
      height: calc(100% - 48px);
      overflow-y: auto;
      overflow-x: auto;
      background: #0b0f19;
      padding: 30px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(11, 15, 25, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 20;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Realistic Word Paper Sheet */
    .word-page-container {
      background: #ffffff;
      color: #1e293b;
      width: 820px;
      max-width: 95%;
      min-height: 1050px;
      padding: 56px 64px;
      box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      line-height: 1.6;
      font-size: 14px;
      font-family: "Calibri", "Segoe UI", Arial, sans-serif;
      transform-origin: top center;
      transition: transform 0.15s ease;
      margin-bottom: 40px;
    }

    /* Styling for docx content rendered inside paper */
    .word-page-container h1 { font-size: 26px; font-weight: 700; color: #1e3a8a; margin: 20px 0 12px 0; border-bottom: 2px solid #bfdbfe; padding-bottom: 6px; }
    .word-page-container h2 { font-size: 20px; font-weight: 700; color: #1e40af; margin: 18px 0 10px 0; }
    .word-page-container h3 { font-size: 16px; font-weight: 600; color: #1d4ed8; margin: 14px 0 8px 0; }
    .word-page-container p { margin-bottom: 12px; line-height: 1.6; color: #334155; }
    .word-page-container ul, .word-page-container ol { margin: 12px 0 12px 24px; color: #334155; }
    .word-page-container li { margin-bottom: 6px; }
    .word-page-container table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .word-page-container th, .word-page-container td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    .word-page-container th { background: #f1f5f9; color: #0f172a; font-weight: 600; }
    .word-page-container img { max-width: 100%; height: auto; border-radius: 4px; margin: 12px 0; }
    .word-page-container blockquote { border-left: 4px solid #3b82f6; padding: 8px 16px; background: #eff6ff; color: #1e3a8a; margin: 14px 0; font-style: italic; }

    /* Custom docx-preview styling overrides */
    .docx-wrapper {
      background: transparent !important;
      padding: 0 !important;
    }
    .docx-wrapper > section.docx {
      background: #ffffff !important;
      box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.7) !important;
      margin-bottom: 30px !important;
      border-radius: 3px !important;
    }

    .error-container {
      padding: 30px;
      max-width: 480px;
      background: #1e293b;
      border: 1px solid #e11d48;
      border-radius: 12px;
      text-align: center;
      margin: 40px auto;
    }

    @media print {
      .word-toolbar, .loading-overlay { display: none !important; }
      body, .word-viewport { background: #ffffff !important; padding: 0 !important; overflow: visible !important; }
      .word-page-container, .docx-wrapper > section.docx { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="word-toolbar">
    <div class="toolbar-left">
      <span class="doc-badge">DOCX</span>
      <span class="doc-title" title="${safeName}">${safeName}</span>
      ${formattedSize ? `<span class="doc-size">(${formattedSize})</span>` : ''}
    </div>

    <div class="toolbar-center">
      <button type="button" class="btn" id="zoom-out" title="Reducir Zoom (−)">−</button>
      <span class="zoom-text" id="zoom-label">100%</span>
      <button type="button" class="btn" id="zoom-in" title="Aumentar Zoom (+)">+</button>
      <button type="button" class="btn" id="zoom-reset" title="Restablecer 100%">100%</button>
      <button type="button" class="btn" id="fit-width" title="Ajustar al Ancho">Ajustar</button>
    </div>

    <div class="toolbar-right">
      <button type="button" class="btn" id="print-btn" title="Imprimir documento">🖨️ Imprimir</button>
      <button type="button" class="btn" id="copy-btn" title="Copiar texto del documento">📋 Copiar Texto</button>
      <button type="button" class="btn primary" id="download-btn" title="Descargar documento">⬇ Descargar</button>
    </div>
  </div>

  <div class="word-viewport" id="viewport">
    <div class="loading-overlay" id="loading">
      <div class="spinner"></div>
      <div style="font-size: 12px; color: #93c5fd; font-weight: 500;">Interpretando documento Word...</div>
    </div>
    <div id="document-container" class="word-page-container"></div>
  </div>

  <script>
    (function() {
      var rawData = ${JSON.stringify(wordContent)};
      var fileName = ${JSON.stringify(fileName)};
      var currentZoom = 1.0;

      function getDocxBytes() {
        if (!rawData) return null;
        try {
          var clean = rawData.trim();
          if (clean.indexOf('data:') === 0) {
            var parts = clean.split(',');
            var base64Str = parts[1] || '';
            var binary = atob(base64Str.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
          } else if (/^[A-Za-z0-9+/=\\r\\n]+$/.test(clean) && clean.length > 50) {
            var binary = atob(clean.replace(/\\s/g, ''));
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
          }
        } catch (e) {
          console.warn('[Word] Byte extraction fallback:', e);
        }
        return rawData;
      }

      function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function() { cb(null); };
        s.onerror = function(err) { cb(err); };
        document.head.appendChild(s);
      }

      function ensureLibraries(callback) {
        loadScript('/vendor/docx-preview.min.js', function() {
          loadScript('/vendor/mammoth.browser.min.js', function() {
            callback();
          });
        });
      }

      function showError(msg) {
        var loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        var container = document.getElementById('document-container');
        container.innerHTML = [
          '<div class="error-container">',
          '  <h3 style="color:#f43f5e; margin-bottom:8px;">⚠️ Error al abrir Documento Word</h3>',
          '  <p style="color:#94a3b8; font-size:12px; margin-bottom:16px;">' + (msg || 'No se pudo interpretar el archivo .docx.') + '</p>',
          '  <button type="button" class="btn primary" id="err-dl" style="padding:6px 14px;">⬇ Descargar Documento</button>',
          '</div>'
        ].join('');
        document.getElementById('err-dl').onclick = triggerDownload;
      }

      function triggerDownload() {
        var buffer = getDocxBytes();
        var blob = new Blob([buffer || rawData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'documento.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
      }

      function renderDocument() {
        var buffer = getDocxBytes();
        if (!buffer) {
          showError('El documento está vacío o no contiene datos válidos.');
          return;
        }

        var container = document.getElementById('document-container');

        // Strategy 1: Try docx-preview first for high-fidelity page rendering
        if (window.docx && typeof window.docx.renderAsync === 'function') {
          window.docx.renderAsync(buffer, container, null, {
            className: 'docx-preview',
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false
          }).then(function() {
            var loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
          }).catch(function(err) {
            console.warn('[Word] docx-preview failed, attempting mammoth fallback:', err);
            renderWithMammoth(buffer, container);
          });
          return;
        }

        // Strategy 2: Mammoth fallback
        renderWithMammoth(buffer, container);
      }

      function renderWithMammoth(buffer, container) {
        if (window.mammoth && typeof window.mammoth.convertToHtml === 'function') {
          window.mammoth.convertToHtml({ arrayBuffer: buffer }).then(function(result) {
            container.innerHTML = result.value || '<p style="color:#64748b; font-style:italic;">Documento sin contenido de texto.</p>';
            var loading = document.getElementById('loading');
            if (loading) loading.style.display = 'none';
          }).catch(function(err) {
            console.error('[Word] Mammoth fallback error:', err);
            showError('Error al renderizar documento: ' + err.message);
          });
        } else {
          showError('Los motores de visualización Word no se pudieron inicializar.');
        }
      }

      document.getElementById('zoom-in').onclick = function() {
        currentZoom = Math.min(2.0, Math.round((currentZoom + 0.15) * 100) / 100);
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('document-container').style.transform = 'scale(' + currentZoom + ')';
      };

      document.getElementById('zoom-out').onclick = function() {
        currentZoom = Math.max(0.5, Math.round((currentZoom - 0.15) * 100) / 100);
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('document-container').style.transform = 'scale(' + currentZoom + ')';
      };

      document.getElementById('zoom-reset').onclick = function() {
        currentZoom = 1.0;
        document.getElementById('zoom-label').textContent = '100%';
        document.getElementById('document-container').style.transform = 'scale(1)';
      };

      document.getElementById('fit-width').onclick = function() {
        var viewport = document.getElementById('viewport');
        var availableWidth = viewport.clientWidth - 48;
        currentZoom = Math.max(0.4, Math.min(1.5, Math.round((availableWidth / 820) * 10) / 10));
        document.getElementById('zoom-label').textContent = Math.round(currentZoom * 100) + '%';
        document.getElementById('document-container').style.transform = 'scale(' + currentZoom + ')';
      };

      document.getElementById('print-btn').onclick = function() {
        window.print();
      };

      document.getElementById('copy-btn').onclick = function() {
        var text = document.getElementById('document-container').innerText;
        navigator.clipboard.writeText(text).then(function() {
          var btn = document.getElementById('copy-btn');
          var oldText = btn.textContent;
          btn.textContent = '✓ ¡Copiado!';
          setTimeout(function() { btn.textContent = oldText; }, 2000);
        });
      };

      document.getElementById('download-btn').onclick = triggerDownload;

      ensureLibraries(renderDocument);
    })();
  </script>
</body>
</html>`;
}

/**
 * Generates an interactive, responsive Outlook (.msg) email viewer powered by MsgReader.
 * Supports sender, recipients, subject, rich HTML body, plain text body, RFC headers,
 * inline CID images, attachments extraction and download, search, printing, and file download.
 */
function renderMsgViewerHtml(fileName: string, msgContent: string, fileSize?: number): string {
  const safeName = escapeHtml(fileName || 'mensaje.msg');
  const sizeText = fileSize ? formatBytes(fileSize) : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #0b0f19;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    .msg-app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    /* Top Toolbar */
    .msg-toolbar {
      height: 48px;
      background: #111827;
      border-bottom: 1px solid #1f2937;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 12px;
      flex-shrink: 0;
      z-index: 10;
    }
    .toolbar-left, .toolbar-right, .toolbar-center {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .badge-msg {
      background: #1e3a8a;
      color: #93c5fd;
      border: 1px solid #2563eb;
    }
    .file-title {
      font-size: 12px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }
    .file-size {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
      padding: 2px 6px;
      background: #1e293b;
      border-radius: 4px;
    }
    .search-input {
      background: #1f2937;
      border: 1px solid #374151;
      color: #f8fafc;
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 6px;
      width: 170px;
      transition: all 0.15s;
    }
    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      width: 220px;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    .view-tabs {
      display: flex;
      background: #1f2937;
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn:hover {
      color: #f8fafc;
    }
    .tab-btn.active {
      background: #3b82f6;
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1f2937;
      border: 1px solid #374151;
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
    }
    .btn:hover {
      background: #374151;
      color: #ffffff;
      border-color: #4b5563;
    }
    .btn-primary {
      background: #2563eb;
      border-color: #1d4ed8;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    /* Main Viewport */
    .msg-viewport {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 24px 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: #0f172a;
    }
    /* Envelope / Card Paper */
    .msg-card {
      width: 100%;
      max-width: 860px;
      background: #ffffff;
      color: #1e293b;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* Card Header */
    .card-header {
      padding: 24px 28px 18px;
      border-bottom: 1px solid #f1f5f9;
      background: #ffffff;
    }
    .subject-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
      margin: 0 0 16px 0;
      word-break: break-word;
    }
    .sender-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .sender-details {
      flex: 1;
      min-width: 0;
    }
    .sender-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .sender-email {
      font-size: 12px;
      color: #0284c7;
      font-weight: 500;
      text-decoration: none;
    }
    .sender-email:hover {
      text-decoration: underline;
    }
    .date-sent {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .priority-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      background: #fee2e2;
      color: #b91c1c;
    }
    .recipients-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
      font-size: 12px;
    }
    .recipient-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }
    .recipient-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      width: 44px;
      flex-shrink: 0;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      border: 1px solid #e2e8f0;
    }
    .chip-email {
      color: #64748b;
      font-size: 10px;
    }
    /* Attachments Bar */
    .attachments-bar {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 28px;
    }
    .attachments-header {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .attachments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
    }
    .attachment-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.15s;
    }
    .attachment-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    }
    .att-info {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .att-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    .att-text {
      min-width: 0;
      flex: 1;
    }
    .att-name {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .att-size {
      font-size: 10px;
      color: #64748b;
      font-family: monospace;
    }
    .att-download {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .att-download:hover {
      background: #2563eb;
      color: #ffffff;
      border-color: #1d4ed8;
    }
    /* Card Body */
    .card-body {
      padding: 28px;
      font-size: 14px;
      line-height: 1.6;
      color: #1e293b;
      min-height: 240px;
      word-break: break-word;
    }
    .html-container {
      width: 100%;
    }
    .html-container img {
      max-width: 100%;
      height: auto;
    }
    .html-container table {
      max-width: 100%;
      border-collapse: collapse;
    }
    .html-container a {
      color: #0284c7;
      text-decoration: underline;
    }
    .text-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      white-space: pre-wrap;
      color: #334155;
      font-size: 13px;
      line-height: 1.65;
    }
    .text-container a {
      color: #0284c7;
      text-decoration: underline;
    }
    .headers-container {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      background: #0f172a;
      color: #94a3b8;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    /* Loading Spinner */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 280px;
      color: #64748b;
      gap: 12px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    /* Error Card */
    .error-container {
      padding: 32px;
      text-align: center;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 10px;
      margin: 20px;
    }
    @media print {
      .msg-toolbar { display: none !important; }
      .msg-viewport { padding: 0 !important; background: #ffffff !important; }
      .msg-card { border: none !important; box-shadow: none !important; max-width: 100% !important; }
    }
    @media (max-width: 640px) {
      .msg-toolbar { padding: 0 10px; }
      .search-input { display: none; }
      .card-header, .card-body, .attachments-bar { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="msg-app">
    <!-- Top Toolbar -->
    <div class="msg-toolbar">
      <div class="toolbar-left">
        <span class="badge badge-msg">✉️ MSG</span>
        <span class="file-title" title="${safeName}">${safeName}</span>
        ${sizeText ? `<span class="file-size">${sizeText}</span>` : ''}
      </div>

      <div class="toolbar-center">
        <div class="view-tabs">
          <button type="button" class="tab-btn active" id="tab-mail" title="Vista de correo">📧 Correo</button>
          <button type="button" class="tab-btn" id="tab-text" title="Texto plano">📄 Texto</button>
          <button type="button" class="tab-btn" id="tab-headers" title="Encabezados técnicos">⚙️ Cabeceras</button>
        </div>
        <input type="text" id="search-input" class="search-input" placeholder="🔍 Buscar en mensaje..." />
      </div>

      <div class="toolbar-right">
        <button type="button" class="btn" id="copy-btn" title="Copiar texto del mensaje">📋 Copiar</button>
        <button type="button" class="btn" id="print-btn" title="Imprimir mensaje">🖨️ Imprimir</button>
        <button type="button" class="btn btn-primary" id="download-btn" title="Descargar archivo original .msg">⬇ Descargar .msg</button>
      </div>
    </div>

    <!-- Main Viewport -->
    <div class="msg-viewport" id="viewport">
      <div class="msg-card" id="msg-card">
        <div class="loading-container" id="loading">
          <div class="spinner"></div>
          <div>Cargando mensaje de correo Outlook...</div>
        </div>

        <!-- Rendered Container -->
        <div id="render-target" style="display:none;">
          <!-- Header -->
          <div class="card-header" id="email-header">
            <h1 class="subject-title" id="subject-el"></h1>
            <div class="sender-row">
              <div class="avatar" id="avatar-el">--</div>
              <div class="sender-details">
                <div class="sender-name">
                  <span id="sender-name-el"></span>
                  <a href="#" class="sender-email" id="sender-email-el"></a>
                  <span class="priority-pill" id="priority-el" style="display:none;">🚩 Alta Prioridad</span>
                </div>
                <div class="date-sent" id="date-sent-el"></div>
              </div>
            </div>
            <div class="recipients-section" id="recipients-box">
              <div class="recipient-line" id="recip-to-row" style="display:none;">
                <span class="recipient-label">Para:</span>
                <div id="recip-to-list" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
              </div>
              <div class="recipient-line" id="recip-cc-row" style="display:none;">
                <span class="recipient-label">CC:</span>
                <div id="recip-cc-list" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
              </div>
              <div class="recipient-line" id="recip-bcc-row" style="display:none;">
                <span class="recipient-label">CCO:</span>
                <div id="recip-bcc-list" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
              </div>
            </div>
          </div>

          <!-- Attachments Section -->
          <div class="attachments-bar" id="attachments-section" style="display:none;">
            <div class="attachments-header">
              <span id="attachments-count">📎 Archivos adjuntos</span>
            </div>
            <div class="attachments-grid" id="attachments-grid"></div>
          </div>

          <!-- Body Viewports -->
          <div class="card-body">
            <div class="html-container" id="body-html"></div>
            <div class="text-container" id="body-text" style="display:none;"></div>
            <div class="headers-container" id="body-headers" style="display:none;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      var rawData = ${JSON.stringify(msgContent || '')};
      var fileName = ${JSON.stringify(fileName || 'mensaje.msg')};
      var currentMsgReader = null;
      var currentMsgData = null;
      var activeView = 'mail';

      function getMsgBytes() {
        if (!rawData) return null;
        try {
          var clean = String(rawData).trim();
          var base64Str = '';
          if (clean.indexOf('data:') === 0) {
            var commaIdx = clean.indexOf(',');
            if (commaIdx !== -1) {
              base64Str = clean.substring(commaIdx + 1);
            }
          } else if (/^[A-Za-z0-9+/=\s]+$/.test(clean) && clean.length > 30) {
            base64Str = clean;
          }

          if (base64Str) {
            base64Str = base64Str.replace(/\s/g, '');
            while (base64Str.length % 4 !== 0) {
              base64Str += '=';
            }
            var binary = atob(base64Str);
            var len = binary.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          }

          if (typeof clean === 'string' && clean.length > 0) {
            var len = clean.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = clean.charCodeAt(i) & 0xff;
            }
            return bytes;
          }
        } catch (e) {
          console.warn('[MSG] Base64 decoding failed:', e);
        }
        return null;
      }

      function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function() { cb(null); };
        s.onerror = function(err) { cb(err); };
        document.head.appendChild(s);
      }

      function ensureMsgReader(callback) {
        if (window.MsgReader) {
          callback();
          return;
        }
        try {
          if (window.parent && window.parent.MsgReader) {
            window.MsgReader = window.parent.MsgReader;
            callback();
            return;
          }
        } catch (e) {}
        loadScript('/vendor/msgreader.bundle.js', function(err) {
          if (!err && window.MsgReader) {
            callback();
            return;
          }
          try {
            if (window.parent && window.parent.MsgReader) {
              window.MsgReader = window.parent.MsgReader;
              callback();
              return;
            }
          } catch (e) {}
          // CDN fallback
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/msgreader/1.28.0/lib/MsgReader.js', function() {
            callback();
          });
        });
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }

      function linkify(text) {
        if (!text) return '';
        var escaped = escapeHtml(text);
        return escaped
          .replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
          .replace(/\\r?\\n/g, '<br>');
      }

      function getInitials(name) {
        if (!name) return 'MSG';
        var parts = name.trim().split(/\\s+/);
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
      }

      function getFileIcon(filename) {
        var ext = (filename || '').split('.').pop().toLowerCase();
        if (['pdf'].indexOf(ext) !== -1) return '📑';
        if (['xlsx', 'xls', 'csv'].indexOf(ext) !== -1) return '📊';
        if (['docx', 'doc'].indexOf(ext) !== -1) return '📝';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) !== -1) return '🖼️';
        if (['zip', 'rar', '7z', 'tar', 'gz'].indexOf(ext) !== -1) return '📦';
        return '📄';
      }

      function showError(msg) {
        var loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        var renderTarget = document.getElementById('render-target');
        if (renderTarget) renderTarget.style.display = 'none';

        var card = document.getElementById('msg-card');
        var errHtml = [
          '<div class="error-container">',
          '  <h3 style="color:#e11d48; margin-top:0;">⚠️ No se pudo procesar el archivo .msg</h3>',
          '  <p style="color:#475569; font-size:13px; margin-bottom:16px;">' + (msg || 'El formato del archivo no coincide con un mensaje de Outlook válido.') + '</p>',
          '  <button type="button" class="btn btn-primary" id="err-dl-btn">⬇ Descargar archivo original</button>',
          '</div>'
        ].join('');
        card.innerHTML = errHtml;
        document.getElementById('err-dl-btn').onclick = triggerDownload;
      }

      function triggerDownload() {
        var bytes = getMsgBytes();
        var blob = new Blob([bytes || rawData], { type: 'application/vnd.ms-outlook' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'mensaje.msg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
      }

      window.downloadAttachment = function(idx) {
        if (!currentMsgReader || !currentMsgData || !currentMsgData.attachments) return;
        var att = currentMsgData.attachments[idx];
        if (!att) return;
        try {
          var attData = currentMsgReader.getAttachment(att);
          if (!attData || !attData.content) {
            alert('No se pudo extraer el contenido del adjunto.');
            return;
          }
          var blob = new Blob([attData.content], { type: 'application/octet-stream' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = attData.fileName || att.fileName || att.name || ('adjunto_' + (idx + 1));
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
        } catch (e) {
          console.error('[MSG] Error downloading attachment:', e);
          alert('Error al descargar archivo adjunto: ' + e.message);
        }
      };

      function renderMsg() {
        var bytes = getMsgBytes();
        if (!bytes || bytes.length === 0) {
          showError('El archivo está vacío o no contiene datos válidos.');
          return;
        }

        var MsgReaderClass = window.MsgReader;
        if (!MsgReaderClass && window.MsgReaderModule) {
          MsgReaderClass = window.MsgReaderModule.default || window.MsgReaderModule;
        }
        if (!MsgReaderClass && typeof window.default === 'function') {
          MsgReaderClass = window.default;
        }
        if (!MsgReaderClass) {
          try {
            if (window.parent && window.parent.MsgReader) {
              MsgReaderClass = window.parent.MsgReader;
              window.MsgReader = MsgReaderClass;
            }
          } catch (e) {}
        }

        if (!MsgReaderClass) {
          showError('No se pudo cargar el motor lector de archivos MSG.');
          return;
        }

        try {
          var TargetArrayBuffer = (window.parent && MsgReaderClass === window.parent.MsgReader && window.parent.ArrayBuffer)
            ? window.parent.ArrayBuffer
            : ArrayBuffer;
          var TargetUint8Array = (window.parent && MsgReaderClass === window.parent.MsgReader && window.parent.Uint8Array)
            ? window.parent.Uint8Array
            : Uint8Array;

          var parentBuf = new TargetArrayBuffer(bytes.length);
          var parentView = new TargetUint8Array(parentBuf);
          for (var i = 0; i < bytes.length; i++) {
            parentView[i] = bytes[i];
          }

          var reader = new MsgReaderClass(parentBuf);
          currentMsgReader = reader;
          var msg = reader.getFileData();
          currentMsgData = msg;

          if (msg.error) {
            showError('Error al decodificar mensaje: ' + msg.error);
            return;
          }

          // 1. Subject
          var subject = msg.subject || '(Sin Asunto)';
          document.getElementById('subject-el').textContent = subject;

          // 2. Sender
          var senderName = msg.senderName || msg.senderEmail || 'Remitente desconocido';
          var senderEmail = msg.senderEmail || '';
          document.getElementById('sender-name-el').textContent = senderName;
          document.getElementById('avatar-el').textContent = getInitials(senderName);
          var emailLink = document.getElementById('sender-email-el');
          if (senderEmail) {
            emailLink.textContent = '<' + senderEmail + '>';
            emailLink.href = 'mailto:' + encodeURIComponent(senderEmail);
            emailLink.style.display = 'inline';
          } else {
            emailLink.style.display = 'none';
          }

          // 3. Priority
          if (msg.importance === 2 || msg.priority === 1) {
            document.getElementById('priority-el').style.display = 'inline-flex';
          }

          // 4. Date Sent
          var dateVal = msg.messageDeliveryTime || msg.clientSubmitTime;
          if (dateVal) {
            try {
              var d = new Date(dateVal);
              if (!isNaN(d.getTime())) {
                document.getElementById('date-sent-el').innerHTML = '📅 ' + escapeHtml(d.toLocaleString('es-ES', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }));
              } else {
                document.getElementById('date-sent-el').textContent = '📅 ' + String(dateVal);
              }
            } catch (e) {
              document.getElementById('date-sent-el').textContent = '📅 ' + String(dateVal);
            }
          } else {
            document.getElementById('date-sent-el').textContent = '📅 Fecha de envío no especificada';
          }

          // 5. Recipients (To, CC, BCC)
          var recips = msg.recipients || [];
          var toRecips = [];
          var ccRecips = [];
          var bccRecips = [];
          for (var r = 0; r < recips.length; r++) {
            var item = recips[r];
            var type = (item.recipType || '').toLowerCase();
            if (type === 'cc') ccRecips.push(item);
            else if (type === 'bcc') bccRecips.push(item);
            else toRecips.push(item);
          }

          function renderRecipChips(list, containerId, rowId) {
            if (list.length === 0) return;
            var row = document.getElementById(rowId);
            var container = document.getElementById(containerId);
            row.style.display = 'flex';
            container.innerHTML = list.map(function(rcp) {
              var email = rcp.smtpAddress || rcp.email || '';
              var name = rcp.name || email || 'Destinatario';
              var emailSuffix = email && email !== name ? ' (' + email + ')' : '';
              return '<span class="chip">👤 ' + escapeHtml(name) + '<span class="chip-email">' + escapeHtml(emailSuffix) + '</span></span>';
            }).join('');
          }

          renderRecipChips(toRecips, 'recip-to-list', 'recip-to-row');
          renderRecipChips(ccRecips, 'recip-cc-list', 'recip-cc-row');
          renderRecipChips(bccRecips, 'recip-bcc-list', 'recip-bcc-row');

          // 6. Attachments
          var attachments = msg.attachments || [];
          if (attachments.length > 0) {
            var section = document.getElementById('attachments-section');
            section.style.display = 'block';
            document.getElementById('attachments-count').textContent = '📎 Archivos adjuntos (' + attachments.length + ')';
            var grid = document.getElementById('attachments-grid');
            grid.innerHTML = attachments.map(function(att, idx) {
              var name = att.fileName || att.name || ('adjunto_' + (idx + 1));
              var sizeStr = att.contentLength ? formatBytes(att.contentLength) : '';
              var icon = getFileIcon(name);
              return [
                '<div class="attachment-card">',
                '  <div class="att-info">',
                '    <span class="att-icon">' + icon + '</span>',
                '    <div class="att-text">',
                '      <div class="att-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</div>',
                '      <div class="att-size">' + escapeHtml(sizeStr) + '</div>',
                '    </div>',
                '  </div>',
                '  <button type="button" class="att-download" onclick="window.downloadAttachment(' + idx + ')">⬇ Descargar</button>',
                '</div>'
              ].join('');
            }).join('');
          }

          // 7. Body Processing (HTML + Plain Text + Inline CID images)
          var htmlBody = msg.bodyHtml || (typeof msg.html === 'string' ? msg.html : (msg.html ? new TextDecoder('utf-8').decode(msg.html) : '')) || msg.bodyHTML || '';
          var textBody = msg.body || '';

          // Inline CID image resolution
          if (htmlBody && attachments.length > 0) {
            for (var aIdx = 0; aIdx < attachments.length; aIdx++) {
              var attItem = attachments[aIdx];
              var cid = attItem.attachContentId || attItem.contentId;
              if (cid) {
                try {
                  var attObj = reader.getAttachment(attItem);
                  if (attObj && attObj.content) {
                    var binary = '';
                    var bytesArr = new Uint8Array(attObj.content);
                    var len = bytesArr.byteLength;
                    for (var bI = 0; bI < len; bI++) {
                      binary += String.fromCharCode(bytesArr[bI]);
                    }
                    var b64Data = btoa(binary);
                    var mimeImg = 'image/png';
                    if (/\\.jpe?g$/i.test(attObj.fileName || '')) mimeImg = 'image/jpeg';
                    else if (/\\.gif$/i.test(attObj.fileName || '')) mimeImg = 'image/gif';
                    var dataUrl = 'data:' + mimeImg + ';base64,' + b64Data;
                    htmlBody = htmlBody.split('cid:' + cid).join(dataUrl);
                  }
                } catch (e) {
                  console.warn('[MSG] Failed inline CID resolution:', e);
                }
              }
            }
          }

          var bodyHtmlEl = document.getElementById('body-html');
          var bodyTextEl = document.getElementById('body-text');
          var bodyHeadersEl = document.getElementById('body-headers');

          if (htmlBody) {
            bodyHtmlEl.innerHTML = htmlBody;
          } else if (textBody) {
            bodyHtmlEl.innerHTML = linkify(textBody);
          } else {
            bodyHtmlEl.innerHTML = '<p style="color:#64748b; font-style:italic;">(El mensaje no contiene cuerpo de texto)</p>';
          }

          bodyTextEl.innerHTML = linkify(textBody || '(Sin contenido de texto plano)');
          bodyHeadersEl.textContent = msg.headers || 'No se han encontrado encabezados RFC en este mensaje.';

          // Show render target
          document.getElementById('loading').style.display = 'none';
          document.getElementById('render-target').style.display = 'block';

        } catch (err) {
          console.error('[MSG] Render error:', err);
          showError('Error al analizar archivo .msg: ' + err.message);
        }
      }

      // Tab switcher
      function setView(view) {
        activeView = view;
        document.getElementById('tab-mail').className = 'tab-btn' + (view === 'mail' ? ' active' : '');
        document.getElementById('tab-text').className = 'tab-btn' + (view === 'text' ? ' active' : '');
        document.getElementById('tab-headers').className = 'tab-btn' + (view === 'headers' ? ' active' : '');

        document.getElementById('body-html').style.display = (view === 'mail' ? 'block' : 'none');
        document.getElementById('body-text').style.display = (view === 'text' ? 'block' : 'none');
        document.getElementById('body-headers').style.display = (view === 'headers' ? 'block' : 'none');
      }

      document.getElementById('tab-mail').onclick = function() { setView('mail'); };
      document.getElementById('tab-text').onclick = function() { setView('text'); };
      document.getElementById('tab-headers').onclick = function() { setView('headers'); };

      // Search filtering
      document.getElementById('search-input').oninput = function(e) {
        var query = (e.target.value || '').trim().toLowerCase();
        var card = document.getElementById('msg-card');
        if (!query) {
          card.style.opacity = '1';
          return;
        }
        var text = card.innerText.toLowerCase();
        if (text.indexOf(query) !== -1) {
          card.style.opacity = '1';
        } else {
          card.style.opacity = '0.4';
        }
      };

      // Copy text button
      document.getElementById('copy-btn').onclick = function() {
        var content = '';
        if (currentMsgData && currentMsgData.body) {
          content = currentMsgData.body;
        } else {
          content = document.getElementById('body-html').innerText;
        }
        navigator.clipboard.writeText(content).then(function() {
          var btn = document.getElementById('copy-btn');
          var old = btn.textContent;
          btn.textContent = '✓ ¡Copiado!';
          setTimeout(function() { btn.textContent = old; }, 2000);
        });
      };

      // Print button
      document.getElementById('print-btn').onclick = function() {
        window.print();
      };

      // Download button
      document.getElementById('download-btn').onclick = triggerDownload;

      // Initialize
      ensureMsgReader(renderMsg);
    })();
  </script>
</body>
</html>`;
}
