import Dexie, { Table } from 'dexie';
import { LibraryRoot, LibraryFileNode, LibrarySyncMode, LibraryRefreshMode } from '../types';
import { SAMPLE_EXCEL_B64, SAMPLE_WORD_B64, SAMPLE_PDF_B64, SAMPLE_MSG_B64 } from './sampleLibraryFiles';

class LibraryDexieDB extends Dexie {
  roots!: Table<LibraryRoot, string>;
  handles!: Table<{ id: string; handle: any }, string>;

  constructor() {
    super('Dexie_Database_Libraries_v1');
    this.version(1).stores({
      roots: 'id, dbName, name, syncMode, updatedAt',
      handles: 'id'
    });
  }
}

export const libraryDb = new LibraryDexieDB();

export function normalizePath(path: string): string {
  if (!path || path === '.' || path === './') return '/';
  let clean = path.replace(/\\/g, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  // Resolve . and ..
  const parts = clean.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return '/' + stack.join('/');
}

export function getParentPath(path: string): string {
  const norm = normalizePath(path);
  if (norm === '/') return '/';
  const lastSlash = norm.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return norm.substring(0, lastSlash);
}

export function getFileName(path: string): string {
  const norm = normalizePath(path);
  const parts = norm.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

export function getFileExtension(filename: string): string {
  const clean = (filename || '').trim();
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx === -1) return '';
  return clean.substring(dotIdx + 1).toLowerCase();
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
    case 'mjs':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'csv':
      return 'text/csv';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'ods':
      return 'application/vnd.oasis.opendocument.spreadsheet';
    case 'xml':
      return 'application/xml';
    case 'msg':
      return 'application/vnd.ms-outlook';
    default:
      return 'application/octet-stream';
  }
}

export function isTextMimeType(mimeType: string, filename?: string): boolean {
  if (filename) {
    const ext = getFileExtension(filename);
    if (['xlsx', 'xls', 'docx', 'doc', 'msg', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'zip', 'tar', 'gz'].includes(ext)) {
      return false;
    }
    if (['html', 'htm', 'css', 'js', 'mjs', 'json', 'md', 'markdown', 'txt', 'svg', 'xml', 'csv', 'tsv', 'ts', 'tsx'].includes(ext)) {
      return true;
    }
  }
  return mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'image/svg+xml' ||
    mimeType === 'application/xml';
}

/**
 * Calculates total file count and total size in bytes for a file tree.
 */
export function calculateTreeStats(node: LibraryFileNode): { fileCount: number; totalSizeBytes: number } {
  let fileCount = 0;
  let totalSizeBytes = 0;

  function traverse(n: LibraryFileNode) {
    if (n.type === 'file') {
      fileCount++;
      totalSizeBytes += n.size || (n.content ? n.content.length : 0);
    } else if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return { fileCount, totalSizeBytes };
}

/**
 * Finds a node in the tree by its absolute path.
 */
export function findNodeByPath(rootNode: LibraryFileNode, targetPath: string): LibraryFileNode | null {
  const normTarget = normalizePath(targetPath);
  if (normTarget === '/' || normTarget === rootNode.path) return rootNode;

  function search(node: LibraryFileNode): LibraryFileNode | null {
    if (normalizePath(node.path) === normTarget) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return null;
  }

  return search(rootNode);
}

/**
 * Flattens all files in a tree into a Map of normalized path -> node
 */
export function flattenTreeFiles(rootNode: LibraryFileNode): Map<string, LibraryFileNode> {
  const map = new Map<string, LibraryFileNode>();

  function traverse(n: LibraryFileNode) {
    map.set(normalizePath(n.path), n);
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(rootNode);
  return map;
}

/**
 * Immutably adds a new folder or file to a parent folder path.
 */
export function addNodeToTree(
  rootNode: LibraryFileNode,
  parentPath: string,
  newNode: LibraryFileNode
): LibraryFileNode {
  const normParent = normalizePath(parentPath);

  function cloneWithAdd(node: LibraryFileNode): LibraryFileNode {
    if (normalizePath(node.path) === normParent) {
      const existing = node.children || [];
      // Remove any existing node with same name
      const filtered = existing.filter(c => c.name.toLowerCase() !== newNode.name.toLowerCase());
      const updatedChildren = [...filtered, newNode].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return {
        ...node,
        children: updatedChildren
      };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(cloneWithAdd)
      };
    }

    return node;
  }

  return cloneWithAdd(rootNode);
}

/**
 * Immutably updates a node in the tree.
 */
export function updateNodeInTree(
  rootNode: LibraryFileNode,
  targetPath: string,
  updater: (node: LibraryFileNode) => LibraryFileNode
): LibraryFileNode {
  const normTarget = normalizePath(targetPath);

  function cloneWithUpdate(node: LibraryFileNode): LibraryFileNode {
    if (normalizePath(node.path) === normTarget) {
      return updater(node);
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(cloneWithUpdate)
      };
    }
    return node;
  }

  return cloneWithUpdate(rootNode);
}

/**
 * Immutably deletes a node by path.
 */
export function deleteNodeFromTree(
  rootNode: LibraryFileNode,
  targetPath: string
): LibraryFileNode {
  const normTarget = normalizePath(targetPath);
  if (normTarget === '/') return rootNode; // Cannot delete root folder

  function cloneWithDelete(node: LibraryFileNode): LibraryFileNode {
    if (node.children) {
      const filtered = node.children
        .filter(c => normalizePath(c.path) !== normTarget)
        .map(cloneWithDelete);
      return {
        ...node,
        children: filtered
      };
    }
    return node;
  }

  return cloneWithDelete(rootNode);
}

/**
 * Resolves a relative path from a current directory.
 */
export function resolveRelativePath(currentDir: string, relativePath: string): string {
  if (!relativePath) return currentDir;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('data:') || relativePath.startsWith('blob:') || relativePath.startsWith('mailto:')) {
    return relativePath;
  }
  // Strip query/hash for path resolution
  const [cleanRel] = relativePath.split(/[?#]/);
  if (cleanRel.startsWith('/')) {
    return normalizePath(cleanRel);
  }
  const normDir = normalizePath(currentDir);
  return normalizePath(`${normDir}/${cleanRel}`);
}

type LibraryUpdateListener = (dbName: string, rootId: string) => void;

class DbLibraryService {
  private updateListeners: Set<LibraryUpdateListener> = new Set();
  private scheduledTimers: Map<string, number> = new Map();
  private isInitialized = false;

  constructor() {
    // Delay timer setup until browser is idle
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.initScheduledSyncEngine();
      }, 1000);
    }
  }

  public subscribe(listener: LibraryUpdateListener): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  private notify(dbName: string, rootId: string) {
    this.updateListeners.forEach(listener => {
      try {
        listener(dbName, rootId);
      } catch (e) {
        console.error('Error in library listener:', e);
      }
    });
  }

  /**
   * Returns all Library Roots associated with a specific database.
   */
  public async getRootsForDb(dbName: string): Promise<LibraryRoot[]> {
    if (!dbName) return [];
    try {
      const roots = await libraryDb.roots.where('dbName').equals(dbName).toArray();

      // Ensure any existing root has the sample .msg file available
      for (const root of roots) {
        const allFiles = flattenTreeFiles(root.tree);
        const hasMsg = Array.from(allFiles.values()).some(f => f.name.toLowerCase().endsWith('.msg'));
        if (!hasMsg) {
          const docFolder = root.tree.children?.find(c => c.name === 'documentos' && c.type === 'folder');
          const targetFolder = docFolder ? '/documentos' : '/';
          const filePath = targetFolder === '/' ? '/Transferencias sin factura .msg' : '/documentos/Transferencias sin factura .msg';
          const msgNode: LibraryFileNode = {
            id: `node_file_msg_auto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: 'Transferencias sin factura .msg',
            path: filePath,
            type: 'file',
            size: 15020,
            mimeType: 'application/vnd.ms-outlook',
            lastModified: Date.now(),
            content: SAMPLE_MSG_B64
          };
          root.tree = addNodeToTree(root.tree, targetFolder, msgNode);
          const stats = calculateTreeStats(root.tree);
          root.fileCount = stats.fileCount;
          root.totalSizeBytes = stats.totalSizeBytes;
          root.updatedAt = Date.now();
          await libraryDb.roots.put(root);
        }
      }

      // Sort by updatedAt descending
      return roots.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (e) {
      console.error('Failed to get library roots:', e);
      return [];
    }
  }

  /**
   * Retrieves a single LibraryRoot by ID.
   */
  public async getRoot(rootId: string): Promise<LibraryRoot | null> {
    try {
      const root = await libraryDb.roots.get(rootId);
      return root || null;
    } catch (e) {
      console.error('Failed to get root:', e);
      return null;
    }
  }

  /**
   * Finds a root by name (case-insensitive) for a given DB.
   */
  public async findRootByName(dbName: string, rootName: string): Promise<LibraryRoot | null> {
    try {
      const roots = await this.getRootsForDb(dbName);
      const cleanTarget = rootName.trim().toLowerCase();
      return roots.find(r => r.name.toLowerCase() === cleanTarget) || null;
    } catch (e) {
      console.error('Failed to find root by name:', e);
      return null;
    }
  }

  /**
   * Saves or updates a LibraryRoot record.
   */
  public async saveRoot(root: LibraryRoot): Promise<void> {
    const stats = calculateTreeStats(root.tree);
    const updated: LibraryRoot = {
      ...root,
      fileCount: stats.fileCount,
      totalSizeBytes: stats.totalSizeBytes,
      updatedAt: Date.now()
    };
    await libraryDb.roots.put(updated);
    this.restartScheduledTimer(updated);
    this.notify(updated.dbName, updated.id);
  }

  /**
   * Creates a new LibraryRoot for a database with a default interactive template.
   */
  public async createRoot(
    dbName: string,
    name: string,
    options?: {
      description?: string;
      syncMode?: LibrarySyncMode;
      refreshMode?: LibraryRefreshMode;
      refreshIntervalSeconds?: number;
      initialTemplate?: 'blank' | 'web-app' | 'docs' | 'assets';
    }
  ): Promise<LibraryRoot> {
    const id = `root_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const syncMode = options?.syncMode || 'static';
    const refreshMode = options?.refreshMode || 'manual';
    const refreshIntervalSeconds = options?.refreshIntervalSeconds || 30;
    const template = options?.initialTemplate || 'web-app';

    let tree: LibraryFileNode;

    if (template === 'web-app') {
      tree = {
        id: `node_root_${id}`,
        name: name,
        path: '/',
        type: 'folder',
        size: 0,
        mimeType: 'inode/directory',
        lastModified: Date.now(),
        children: [
          {
            id: `node_html_${Date.now()}`,
            name: 'index.html',
            path: '/index.html',
            type: 'file',
            size: 850,
            mimeType: 'text/html',
            lastModified: Date.now(),
            content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Visor de Librería</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Librería Raíz: ${name}</div>
      <h1>Bienvenido a ${name}</h1>
      <p>Este archivo se renderiza directamente desde el árbol de archivos de la base de datos <strong>${dbName}</strong> en el MiniBrowser.</p>
    </div>
    
    <div class="features">
      <div class="item">
        <span class="icon">📊</span>
        <div>
          <h3>Hoja de Cálculo Excel (.xlsx)</h3>
          <p><a href="documentos/reporte_ventas.xlsx" style="color:#34d399; font-weight:600; text-decoration:underline;">reporte_ventas.xlsx</a> con rejilla interactiva, pestañas y filtros.</p>
        </div>
      </div>
      <div class="item">
        <span class="icon">📑</span>
        <div>
          <h3>Documento PDF (.pdf)</h3>
          <p><a href="documentos/manual_usuario.pdf" style="color:#f43f5e; font-weight:600; text-decoration:underline;">manual_usuario.pdf</a> con visor multipágina, zoom y descarga.</p>
        </div>
      </div>
      <div class="item">
        <span class="icon">📝</span>
        <div>
          <h3>Documento Word (.docx)</h3>
          <p><a href="documentos/propuesta_comercial.docx" style="color:#60a5fa; font-weight:600; text-decoration:underline;">propuesta_comercial.docx</a> con formato de documento y estilos.</p>
        </div>
      </div>
      <div class="item">
        <span class="icon">✉️</span>
        <div>
          <h3>Mensaje Outlook (.msg)</h3>
          <p><a href="documentos/Transferencias sin factura .msg" style="color:#38bdf8; font-weight:600; text-decoration:underline;">Transferencias sin factura .msg</a> con remitente, destinatarios y adjuntos.</p>
        </div>
      </div>
      <div class="item">
        <span class="icon">⚡</span>
        <div>
          <h3>Sincronización</h3>
          <p>Compatible con copias estáticas y copias vinculadas con refresco automático.</p>
        </div>
      </div>
    </div>

    <div class="actions" style="flex-wrap:wrap; gap:8px;">
      <a href="about.html" class="btn">Ver página About &rarr;</a>
      <a href="documentos/reporte_ventas.xlsx" class="btn btn-secondary">📊 Ver Excel</a>
      <a href="documentos/manual_usuario.pdf" class="btn btn-secondary">📑 Ver PDF</a>
      <a href="documentos/propuesta_comercial.docx" class="btn btn-secondary">📝 Ver Word</a>
      <a href="documentos/Transferencias sin factura .msg" class="btn btn-secondary">✉️ Ver Mensaje MSG</a>
      <button onclick="saludar()" class="btn btn-secondary">Probar JS</button>
    </div>

    <div id="output" class="output"></div>
  </div>

  <script src="script.js"></script>
</body>
</html>`
          },
          {
            id: `node_css_${Date.now() + 1}`,
            name: 'style.css',
            path: '/style.css',
            type: 'file',
            size: 980,
            mimeType: 'text/css',
            lastModified: Date.now(),
            content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  max-width: 620px;
  width: 100%;
  padding: 32px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
}

.header .badge {
  display: inline-block;
  background: #6366f1;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header h1 {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
}

.header p {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
}

.features {
  margin: 24px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.features .item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.features .item .icon {
  font-size: 20px;
}

.features .item h3 {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}

.features .item p {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn {
  display: inline-block;
  background: #4f46e5;
  color: white;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:hover {
  background: #4338ca;
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.output {
  margin-top: 16px;
  font-size: 12px;
  color: #38bdf8;
  font-family: monospace;
}`
          },
          {
            id: `node_js_${Date.now() + 2}`,
            name: 'script.js',
            path: '/script.js',
            type: 'file',
            size: 320,
            mimeType: 'application/javascript',
            lastModified: Date.now(),
            content: `function saludar() {
  const out = document.getElementById('output');
  if (out) {
    const ahora = new Date().toLocaleTimeString();
    out.innerText = '⚡ [MiniBrowser JS]: ¡Interacción ejecutada exitosamente a las ' + ahora + '!';
  }
}`
          },
          {
            id: `node_about_${Date.now() + 3}`,
            name: 'about.html',
            path: '/about.html',
            type: 'file',
            size: 550,
            mimeType: 'text/html',
            lastModified: Date.now(),
            content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acerca de - ${name}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Navegación Relativa</div>
      <h1>Página Secundaria: about.html</h1>
      <p>Has navegado exitosamente a través de una referencia relativa en el árbol de la librería.</p>
    </div>
    <div class="actions" style="margin-top: 20px;">
      <a href="index.html" class="btn">&larr; Volver al Inicio</a>
    </div>
  </div>
</body>
</html>`
          },
          {
            id: `node_folder_docs_${Date.now() + 4}`,
            name: 'documentos',
            path: '/documentos',
            type: 'folder',
            size: 0,
            mimeType: 'inode/directory',
            lastModified: Date.now(),
            children: [
              {
                id: `node_file_excel_${Date.now() + 5}`,
                name: 'reporte_ventas.xlsx',
                path: '/documentos/reporte_ventas.xlsx',
                type: 'file',
                size: 26768,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                lastModified: Date.now(),
                content: SAMPLE_EXCEL_B64
              },
              {
                id: `node_file_pdf_${Date.now() + 6}`,
                name: 'manual_usuario.pdf',
                path: '/documentos/manual_usuario.pdf',
                type: 'file',
                size: 7243,
                mimeType: 'application/pdf',
                lastModified: Date.now(),
                content: SAMPLE_PDF_B64
              },
              {
                id: `node_file_word_${Date.now() + 7}`,
                name: 'propuesta_comercial.docx',
                path: '/documentos/propuesta_comercial.docx',
                type: 'file',
                size: 17452,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                lastModified: Date.now(),
                content: SAMPLE_WORD_B64
              },
              {
                id: `node_file_msg_${Date.now() + 8}`,
                name: 'Transferencias sin factura .msg',
                path: '/documentos/Transferencias sin factura .msg',
                type: 'file',
                size: 15020,
                mimeType: 'application/vnd.ms-outlook',
                lastModified: Date.now(),
                content: SAMPLE_MSG_B64
              }
            ]
          }
        ]
      };
    } else {
      tree = {
        id: `node_root_${id}`,
        name: name,
        path: '/',
        type: 'folder',
        size: 0,
        mimeType: 'inode/directory',
        lastModified: Date.now(),
        children: []
      };
    }

    const stats = calculateTreeStats(tree);
    const newRoot: LibraryRoot = {
      id,
      dbName,
      name,
      description: options?.description || `Raíz de archivos para ${dbName}`,
      syncMode,
      refreshMode,
      refreshIntervalSeconds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileCount: stats.fileCount,
      totalSizeBytes: stats.totalSizeBytes,
      sourceType: 'manual',
      tree
    };

    await libraryDb.roots.put(newRoot);
    this.restartScheduledTimer(newRoot);
    this.notify(dbName, newRoot.id);
    return newRoot;
  }

  /**
   * Deletes a library root.
   */
  public async deleteRoot(rootId: string): Promise<void> {
    const root = await libraryDb.roots.get(rootId);
    if (!root) return;
    const dbName = root.dbName;
    await libraryDb.roots.delete(rootId);
    await libraryDb.handles.delete(rootId);
    this.stopScheduledTimer(rootId);
    this.notify(dbName, rootId);
  }

  /**
   * Saves a FileSystemDirectoryHandle for linked local folders (if supported).
   */
  public async saveDirectoryHandle(rootId: string, handle: any): Promise<void> {
    try {
      await libraryDb.handles.put({ id: rootId, handle });
    } catch (e) {
      console.warn('Could not store directory handle in IndexedDB:', e);
    }
  }

  /**
   * Retrieves a stored FileSystemDirectoryHandle.
   */
  public async getDirectoryHandle(rootId: string): Promise<any | null> {
    try {
      const rec = await libraryDb.handles.get(rootId);
      return rec ? rec.handle : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Reads files from a FileSystemDirectoryHandle recursively.
   */
  public async scanDirectoryHandle(dirHandle: any, rootName: string): Promise<LibraryFileNode> {
    async function scanSubDir(handle: any, currentPath: string): Promise<LibraryFileNode[]> {
      const children: LibraryFileNode[] = [];
      for await (const [name, entry] of handle.entries()) {
        const itemPath = normalizePath(`${currentPath}/${name}`);
        if (entry.kind === 'file') {
          try {
            const file = await entry.getFile();
            const mime = getMimeType(name);
            let content = '';
            if (isTextMimeType(mime, name)) {
              content = await file.text();
            } else {
              content = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
              });
            }
            children.push({
              id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              path: itemPath,
              type: 'file',
              size: file.size,
              mimeType: mime,
              lastModified: file.lastModified || Date.now(),
              content
            });
          } catch (err) {
            console.warn(`Failed reading file ${name}:`, err);
          }
        } else if (entry.kind === 'directory') {
          const subChildren = await scanSubDir(entry, itemPath);
          children.push({
            id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name,
            path: itemPath,
            type: 'folder',
            size: 0,
            mimeType: 'inode/directory',
            lastModified: Date.now(),
            children: subChildren.sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
          });
        }
      }
      return children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    const children = await scanSubDir(dirHandle, '/');
    return {
      id: `node_root_${rootName}`,
      name: rootName,
      path: '/',
      type: 'folder',
      size: 0,
      mimeType: 'inode/directory',
      lastModified: Date.now(),
      children
    };
  }

  /**
   * Refreshes a root either from its stored DirectoryHandle or marks it refreshed.
   */
  public async refreshRoot(rootId: string): Promise<LibraryRoot | null> {
    const root = await libraryDb.roots.get(rootId);
    if (!root) return null;

    try {
      const handle = await this.getDirectoryHandle(rootId);
      if (handle) {
        // Verify permission if required
        if (handle.queryPermission) {
          const perm = await handle.queryPermission({ mode: 'read' });
          if (perm === 'granted') {
            const updatedTree = await this.scanDirectoryHandle(handle, root.name);
            const stats = calculateTreeStats(updatedTree);
            const refreshed: LibraryRoot = {
              ...root,
              tree: updatedTree,
              fileCount: stats.fileCount,
              totalSizeBytes: stats.totalSizeBytes,
              lastRefreshed: Date.now(),
              updatedAt: Date.now()
            };
            await libraryDb.roots.put(refreshed);
            this.notify(refreshed.dbName, refreshed.id);
            return refreshed;
          }
        }
      }
    } catch (e) {
      console.warn('Error during root refresh:', e);
    }

    // Fallback: update lastRefreshed
    const updated: LibraryRoot = {
      ...root,
      lastRefreshed: Date.now(),
      updatedAt: Date.now()
    };
    await libraryDb.roots.put(updated);
    this.notify(updated.dbName, updated.id);
    return updated;
  }

  /**
   * Builds an in-memory recursive tree from a standard FileList (e.g. from webkitRelativePath upload).
   */
  public async buildTreeFromFileList(
    rootName: string,
    files: FileList | File[]
  ): Promise<LibraryFileNode> {
    const rootFolder: LibraryFileNode = {
      id: `node_root_${Date.now()}`,
      name: rootName,
      path: '/',
      type: 'folder',
      size: 0,
      mimeType: 'inode/directory',
      lastModified: Date.now(),
      children: []
    };

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      // Determine relative path
      let relPath = (file as any).webkitRelativePath || file.name;
      // Strip leading folder if it represents root
      const parts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);
      let targetPathParts: string[] = [];
      if (parts.length > 1) {
        // Folder upload: parts[0] is uploaded folder name
        targetPathParts = parts.slice(1);
      } else {
        targetPathParts = parts;
      }

      if (targetPathParts.length === 0) continue;

      const fileName = targetPathParts[targetPathParts.length - 1];
      const folderParts = targetPathParts.slice(0, -1);

      // Ensure all ancestor folders exist
      let currentFolder = rootFolder;
      let currPathAccum = '';

      for (const fName of folderParts) {
        currPathAccum += '/' + fName;
        if (!currentFolder.children) currentFolder.children = [];
        let sub = currentFolder.children.find(c => c.type === 'folder' && c.name.toLowerCase() === fName.toLowerCase());
        if (!sub) {
          sub = {
            id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: fName,
            path: currPathAccum,
            type: 'folder',
            size: 0,
            mimeType: 'inode/directory',
            lastModified: Date.now(),
            children: []
          };
          currentFolder.children.push(sub);
        }
        currentFolder = sub;
      }

      // Read file content
      const mime = getMimeType(fileName);
      let content = '';
      if (isTextMimeType(mime, fileName)) {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }

      const filePath = normalizePath(`${currPathAccum}/${fileName}`);
      if (!currentFolder.children) currentFolder.children = [];
      // Remove duplicate if any
      currentFolder.children = currentFolder.children.filter(c => c.name.toLowerCase() !== fileName.toLowerCase());
      currentFolder.children.push({
        id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: fileName,
        path: filePath,
        type: 'file',
        size: file.size,
        mimeType: mime,
        lastModified: file.lastModified || Date.now(),
        content
      });
    }

    // Sort all folders and files alphabetically
    function sortFolder(folder: LibraryFileNode) {
      if (folder.children) {
        folder.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        folder.children.forEach(sortFolder);
      }
    }

    sortFolder(rootFolder);
    return rootFolder;
  }

  /**
   * Initializes the scheduled refresh timers for all linked roots.
   */
  private async initScheduledSyncEngine() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const allRoots = await libraryDb.roots.toArray();
      for (const root of allRoots) {
        this.restartScheduledTimer(root);
      }
    } catch (e) {
      console.warn('Could not initialize scheduled sync engine:', e);
    }
  }

  private restartScheduledTimer(root: LibraryRoot) {
    this.stopScheduledTimer(root.id);

    if (root.syncMode === 'linked' && root.refreshMode === 'scheduled') {
      const intervalSec = Math.max(5, root.refreshIntervalSeconds || 30);
      const timerId = window.setInterval(async () => {
        try {
          await this.refreshRoot(root.id);
        } catch (err) {
          console.warn(`Scheduled refresh failed for root ${root.name}:`, err);
        }
      }, intervalSec * 1000);

      this.scheduledTimers.set(root.id, timerId);
    }
  }

  private stopScheduledTimer(rootId: string) {
    const existing = this.scheduledTimers.get(rootId);
    if (existing) {
      clearInterval(existing);
      this.scheduledTimers.delete(rootId);
    }
  }
}

export const dbLibraryService = new DbLibraryService();
