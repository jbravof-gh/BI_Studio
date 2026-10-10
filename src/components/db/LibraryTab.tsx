import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  File,
  FileCode,
  FileText,
  Image as ImageIcon,
  FileJson,
  Trash2,
  Edit3,
  RefreshCw,
  Upload,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Link2,
  Save,
  Plus,
  Search,
  Sparkles,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Database,
  Eye,
  Sliders,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Download,
  Code,
  Columns,
  Palette,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  FileSpreadsheet,
  Mail
} from 'lucide-react';
import { LibraryRoot, LibraryFileNode, LibrarySyncMode, LibraryRefreshMode } from '../../types';
import { renderLibraryTargetToHtml } from '../../utils/libraryHtmlResolver';
import { FilePreviewPanel } from './FilePreviewPanel';
import {
  dbLibraryService,
  normalizePath,
  getParentPath,
  getFileExtension,
  getMimeType,
  isTextMimeType,
  addNodeToTree,
  updateNodeInTree,
  deleteNodeFromTree,
  findNodeByPath,
  flattenTreeFiles
} from '../../services/dbLibraryService';

interface LibraryTabProps {
  databases: string[];
  selectedDb: string;
  activeDbName: string;
  onSelectDatabase: (name: string) => void;
  onDbChanged: () => void;
  onNotification: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  databases,
  selectedDb,
  activeDbName,
  onSelectDatabase,
  onDbChanged,
  onNotification
}) => {
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<string>('/');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '/': true });
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Modals state
  const [showNewRootModal, setShowNewRootModal] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const [newRootDescription, setNewRootDescription] = useState('');
  const [newRootSyncMode, setNewRootSyncMode] = useState<LibrarySyncMode>('static');
  const [newRootRefreshMode, setNewRootRefreshMode] = useState<LibraryRefreshMode>('manual');
  const [newRootInterval, setNewRootInterval] = useState<number>(30);
  const [newRootTemplate, setNewRootTemplate] = useState<'web-app' | 'blank'>('web-app');

  // File Editor / Viewer / Preview State
  const [editorFileContent, setEditorFileContent] = useState<string>('');
  const [isEditingFile, setIsEditingFile] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [fileViewMode, setFileViewMode] = useState<'preview' | 'code' | 'split'>('preview');

  // New File/Folder Modal
  const [showCreateNodeModal, setShowCreateNodeModal] = useState<boolean>(false);
  const [createNodeType, setCreateNodeType] = useState<'file' | 'folder'>('file');
  const [createNodeName, setCreateNodeName] = useState<string>('');
  const [createNodeParentPath, setCreateNodeParentPath] = useState<string>('/');

  // Hidden File/Folder inputs
  const folderUploadInputRef = useRef<HTMLInputElement>(null);
  const filesUploadInputRef = useRef<HTMLInputElement>(null);

  // Load roots whenever selectedDb changes
  const loadRoots = async () => {
    if (!selectedDb) {
      setRoots([]);
      setSelectedRootId(null);
      return;
    }
    const list = await dbLibraryService.getRootsForDb(selectedDb);
    setRoots(list);
    if (list.length > 0) {
      // Keep selected or choose first
      if (!selectedRootId || !list.some(r => r.id === selectedRootId)) {
        setSelectedRootId(list[0].id);
        setSelectedNodePath('/');
      }
    } else {
      setSelectedRootId(null);
    }
  };

  useEffect(() => {
    loadRoots();
  }, [selectedDb]);

  // Subscribe to library updates
  useEffect(() => {
    const unsub = dbLibraryService.subscribe((dbName, rootId) => {
      if (dbName === selectedDb) {
        loadRoots();
      }
    });
    return unsub;
  }, [selectedDb, selectedRootId]);

  const activeRoot = useMemo(() => {
    return roots.find(r => r.id === selectedRootId) || null;
  }, [roots, selectedRootId]);

  const selectedNode = useMemo(() => {
    if (!activeRoot) return null;
    return findNodeByPath(activeRoot.tree, selectedNodePath);
  }, [activeRoot, selectedNodePath]);

  // Sync editor content when selected node changes
  useEffect(() => {
    if (selectedNode && selectedNode.type === 'file' && selectedNode.content !== undefined) {
      setEditorFileContent(selectedNode.content);
      setIsEditingFile(false);
      setHasUnsavedChanges(false);
      const ext = getFileExtension(selectedNode.name);
      if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico', 'bmp'].includes(ext)) {
        setFileViewMode('preview');
      }
    } else {
      setEditorFileContent('');
      setIsEditingFile(false);
      setHasUnsavedChanges(false);
    }
  }, [selectedNodePath, selectedRootId]);

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Copy helper
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
    onNotification({ text: `URL copiada: ${url}`, type: 'success' });
  };

  // Create new Root
  const handleCreateRoot = async () => {
    const name = newRootName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!name) {
      onNotification({ text: 'Por favor, introduce un nombre válido para la Raíz', type: 'error' });
      return;
    }

    if (roots.some(r => r.name.toLowerCase() === name)) {
      onNotification({ text: `Ya existe una raíz con el nombre "${name}" en esta base de datos`, type: 'error' });
      return;
    }

    try {
      const created = await dbLibraryService.createRoot(selectedDb, name, {
        description: newRootDescription.trim() || undefined,
        syncMode: newRootSyncMode,
        refreshMode: newRootRefreshMode,
        refreshIntervalSeconds: newRootInterval,
        initialTemplate: newRootTemplate
      });

      setShowNewRootModal(false);
      setNewRootName('');
      setNewRootDescription('');
      await loadRoots();
      setSelectedRootId(created.id);
      setSelectedNodePath('/');
      onNotification({ text: `Raíz "${name}" creada exitosamente`, type: 'success' });
      onDbChanged();
    } catch (e: any) {
      onNotification({ text: `Error al crear la raíz: ${e.message}`, type: 'error' });
    }
  };

  // Delete active root
  const handleDeleteRoot = async (rootId: string, rootName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la raíz "${rootName}" y todos sus archivos?`)) {
      return;
    }
    try {
      await dbLibraryService.deleteRoot(rootId);
      await loadRoots();
      onNotification({ text: `Raíz "${rootName}" eliminada`, type: 'info' });
      onDbChanged();
    } catch (e: any) {
      onNotification({ text: `Error al eliminar: ${e.message}`, type: 'error' });
    }
  };

  // Refresh active root
  const handleRefreshActiveRoot = async () => {
    if (!activeRoot) return;
    setIsRefreshing(true);
    try {
      const refreshed = await dbLibraryService.refreshRoot(activeRoot.id);
      if (refreshed) {
        await loadRoots();
        onNotification({
          text: `Raíz "${activeRoot.name}" actualizada (${new Date().toLocaleTimeString()})`,
          type: 'success'
        });
      }
    } catch (e: any) {
      onNotification({ text: `Error al refrescar: ${e.message}`, type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create Node (File or Folder)
  const handleCreateNode = async () => {
    if (!activeRoot) return;
    const name = createNodeName.trim();
    if (!name) {
      onNotification({ text: 'Introduce un nombre válido', type: 'error' });
      return;
    }

    const parentPath = normalizePath(createNodeParentPath);
    const itemPath = normalizePath(`${parentPath}/${name}`);

    if (createNodeType === 'folder') {
      const newFolderNode: LibraryFileNode = {
        id: `node_folder_${Date.now()}`,
        name,
        path: itemPath,
        type: 'folder',
        size: 0,
        mimeType: 'inode/directory',
        lastModified: Date.now(),
        children: []
      };
      const updatedTree = addNodeToTree(activeRoot.tree, parentPath, newFolderNode);
      await dbLibraryService.saveRoot({ ...activeRoot, tree: updatedTree });
      setExpandedFolders(prev => ({ ...prev, [parentPath]: true, [itemPath]: true }));
      setSelectedNodePath(itemPath);
    } else {
      const mime = getMimeType(name);
      let initialContent = '';
      if (name.endsWith('.html') || name.endsWith('.htm')) {
        initialContent = `<!DOCTYPE html>\n<html>\n<head>\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>`;
      } else if (name.endsWith('.css')) {
        initialContent = `/* Estilos para ${name} */\nbody {\n  margin: 0;\n  padding: 16px;\n}`;
      } else if (name.endsWith('.js')) {
        initialContent = `// Script ${name}\nconsole.log('${name} cargado');`;
      } else if (name.endsWith('.json')) {
        initialContent = `{\n  "title": "${name}",\n  "version": "1.0.0"\n}`;
      }

      const newFileNode: LibraryFileNode = {
        id: `node_file_${Date.now()}`,
        name,
        path: itemPath,
        type: 'file',
        size: initialContent.length,
        mimeType: mime,
        lastModified: Date.now(),
        content: initialContent
      };
      const updatedTree = addNodeToTree(activeRoot.tree, parentPath, newFileNode);
      await dbLibraryService.saveRoot({ ...activeRoot, tree: updatedTree });
      setExpandedFolders(prev => ({ ...prev, [parentPath]: true }));
      setSelectedNodePath(itemPath);
    }

    setShowCreateNodeModal(false);
    setCreateNodeName('');
    await loadRoots();
    onNotification({ text: `${createNodeType === 'folder' ? 'Carpeta' : 'Archivo'} creado`, type: 'success' });
  };

  // Save modified file content
  const handleSaveFileContent = async () => {
    if (!activeRoot || !selectedNode || selectedNode.type !== 'file') return;

    try {
      const updatedTree = updateNodeInTree(activeRoot.tree, selectedNode.path, (node) => ({
        ...node,
        content: editorFileContent,
        size: editorFileContent.length,
        lastModified: Date.now()
      }));

      await dbLibraryService.saveRoot({ ...activeRoot, tree: updatedTree });
      setHasUnsavedChanges(false);
      setIsEditingFile(false);
      await loadRoots();
      onNotification({ text: `Archivo "${selectedNode.name}" guardado exitosamente`, type: 'success' });
    } catch (e: any) {
      onNotification({ text: `Error al guardar archivo: ${e.message}`, type: 'error' });
    }
  };

  // Delete node from tree
  const handleDeleteNode = async (path: string, name: string) => {
    if (!activeRoot) return;
    if (path === '/') {
      onNotification({ text: 'No se puede eliminar la carpeta raíz', type: 'error' });
      return;
    }
    if (!window.confirm(`¿Eliminar "${name}" del árbol de la librería?`)) return;

    try {
      const updatedTree = deleteNodeFromTree(activeRoot.tree, path);
      await dbLibraryService.saveRoot({ ...activeRoot, tree: updatedTree });
      setSelectedNodePath(getParentPath(path));
      await loadRoots();
      onNotification({ text: `"${name}" eliminado`, type: 'info' });
    } catch (e: any) {
      onNotification({ text: `Error al eliminar: ${e.message}`, type: 'error' });
    }
  };

  // Upload whole folder
  const handleFolderUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeRoot || !e.target.files || e.target.files.length === 0) return;
    const files = e.target.files;

    try {
      setIsRefreshing(true);
      const importedTree = await dbLibraryService.buildTreeFromFileList(activeRoot.name, files);

      // Merge into current active root or replace root tree
      const updated: LibraryRoot = {
        ...activeRoot,
        tree: importedTree,
        sourceType: 'uploaded-folder',
        sourceFolderName: files[0].webkitRelativePath.split('/')[0] || 'carpeta_local',
        lastRefreshed: Date.now(),
        updatedAt: Date.now()
      };

      await dbLibraryService.saveRoot(updated);
      await loadRoots();
      setSelectedNodePath('/');
      onNotification({
        text: `Carpeta cargada con ${files.length} archivo(s) en la raíz "${activeRoot.name}"`,
        type: 'success'
      });
      onDbChanged();
    } catch (err: any) {
      onNotification({ text: `Error al cargar carpeta: ${err.message}`, type: 'error' });
    } finally {
      setIsRefreshing(false);
      if (folderUploadInputRef.current) folderUploadInputRef.current.value = '';
    }
  };

  // Upload individual files to current folder
  const handleFilesUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeRoot || !e.target.files || e.target.files.length === 0) return;
    const fileList: File[] = Array.from(e.target.files);

    const targetFolder = selectedNode?.type === 'folder' ? selectedNode.path : getParentPath(selectedNodePath);

    try {
      setIsRefreshing(true);
      let curTree = activeRoot.tree;

      for (const file of fileList) {
        const mime = getMimeType(file.name);
        let content = '';
        if (isTextMimeType(mime, file.name)) {
          content = await file.text();
        } else {
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        }

        const filePath = normalizePath(`${targetFolder}/${file.name}`);
        const newNode: LibraryFileNode = {
          id: `node_file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          path: filePath,
          type: 'file',
          size: file.size,
          mimeType: mime,
          lastModified: file.lastModified || Date.now(),
          content
        };
        curTree = addNodeToTree(curTree, targetFolder, newNode);
      }

      await dbLibraryService.saveRoot({ ...activeRoot, tree: curTree });
      await loadRoots();
      onNotification({ text: `${fileList.length} archivo(s) añadidos a ${targetFolder}`, type: 'success' });
      onDbChanged();
    } catch (err: any) {
      onNotification({ text: `Error al subir archivos: ${err.message}`, type: 'error' });
    } finally {
      setIsRefreshing(false);
      if (filesUploadInputRef.current) filesUploadInputRef.current.value = '';
    }
  };

  // Web File System Access API linking (if supported)
  const handlePickLocalDirectoryLink = async () => {
    if (!(window as any).showDirectoryPicker) {
      onNotification({
        text: 'Tu navegador no soporta File System Access API nativo. Usa el botón "Cargar Carpeta Local".',
        type: 'info'
      });
      folderUploadInputRef.current?.click();
      return;
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
      if (!dirHandle) return;

      const folderName = dirHandle.name || 'local_dir';
      const rootName = (newRootName || folderName).toLowerCase().replace(/[^a-z0-9_-]/g, '-');

      setIsRefreshing(true);
      const scannedTree = await dbLibraryService.scanDirectoryHandle(dirHandle, rootName);

      const newRoot = await dbLibraryService.createRoot(selectedDb, rootName, {
        description: `Vinculado a carpeta local: ${dirHandle.name}`,
        syncMode: 'linked',
        refreshMode: newRootRefreshMode,
        refreshIntervalSeconds: newRootInterval,
        initialTemplate: 'blank'
      });

      newRoot.tree = scannedTree;
      newRoot.sourceFolderName = dirHandle.name;
      newRoot.sourceType = 'fs-access-linked';

      await dbLibraryService.saveRoot(newRoot);
      await dbLibraryService.saveDirectoryHandle(newRoot.id, dirHandle);

      setShowNewRootModal(false);
      setNewRootName('');
      await loadRoots();
      setSelectedRootId(newRoot.id);
      setSelectedNodePath('/');

      onNotification({
        text: `Carpeta vinculada exitosamente como raíz "${rootName}" con sincronización ${newRootRefreshMode === 'scheduled' ? `programada (${newRootInterval}s)` : 'bajo demanda'}`,
        type: 'success'
      });
      onDbChanged();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onNotification({ text: `Error al vincular carpeta: ${err.message}`, type: 'error' });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render tree node recursively
  const renderTreeNode = (node: LibraryFileNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.path] !== false;
    const isSelected = selectedNodePath === node.path;
    const ext = getFileExtension(node.name);

    let IconComponent = FileText;
    let iconColor = 'text-[#9ca3af]';

    if (isFolder) {
      IconComponent = isExpanded ? FolderOpen : Folder;
      iconColor = 'text-amber-400';
    } else if (['html', 'htm'].includes(ext)) {
      IconComponent = FileCode;
      iconColor = 'text-orange-400';
    } else if (['css'].includes(ext)) {
      IconComponent = FileCode;
      iconColor = 'text-sky-400';
    } else if (['js', 'mjs', 'ts'].includes(ext)) {
      IconComponent = FileCode;
      iconColor = 'text-yellow-400';
    } else if (['json'].includes(ext)) {
      IconComponent = FileJson;
      iconColor = 'text-emerald-400';
    } else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
      IconComponent = ImageIcon;
      iconColor = 'text-purple-400';
    } else if (ext === 'pdf') {
      IconComponent = FileText;
      iconColor = 'text-rose-400 font-semibold';
    } else if (['xlsx', 'xls', 'csv', 'ods', 'tsv'].includes(ext)) {
      IconComponent = FileSpreadsheet;
      iconColor = 'text-emerald-400 font-semibold';
    } else if (['docx', 'doc', 'dotx'].includes(ext)) {
      IconComponent = FileText;
      iconColor = 'text-sky-400 font-semibold';
    } else if (ext === 'msg') {
      IconComponent = Mail;
      iconColor = 'text-blue-400 font-semibold';
    }

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => {
            setSelectedNodePath(node.path);
            if (isFolder) toggleFolder(node.path);
          }}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition group ${
            isSelected
              ? 'bg-[#5865f2] text-white font-medium shadow-sm'
              : 'text-[#cbd5e1] hover:bg-[#25282c] hover:text-white'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          {isFolder ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-white" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-white" />
              )}
            </button>
          ) : (
            <span className="w-3.5" />
          )}

          <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : iconColor}`} />

          <span className="truncate flex-1 font-mono text-[11px]">
            {node.path === '/' ? `${node.name} (Raíz)` : node.name}
          </span>

          {node.type === 'file' && (
            <span className={`text-[10px] font-mono shrink-0 ${isSelected ? 'text-white/80' : 'text-[#64748b]'}`}>
              {node.size ? (node.size > 1024 ? `${(node.size / 1024).toFixed(0)}K` : `${node.size}B`) : ''}
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
            {node.children.length === 0 && (
              <div
                className="text-[10px] text-[#64748b] italic py-1"
                style={{ paddingLeft: `${(depth + 1) * 14 + 24}px` }}
              >
                (carpeta vacía)
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#f2f3f5] overflow-hidden">
      {/* Hidden File Inputs for local folder & file upload */}
      <input
        type="file"
        ref={folderUploadInputRef}
        onChange={handleFolderUploadChange}
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={filesUploadInputRef}
        onChange={handleFilesUploadChange}
        multiple
        className="hidden"
      />

      {/* Top Header: Database Selector & Root Manager */}
      <div className="p-4 border-b border-[#2f3136] bg-[#1a1b1e] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Library - Gestor de Archivos</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#5865f2]/20 text-[#5865f2] border border-[#5865f2]/30">
                Librería BD
              </span>
            </div>
            <p className="text-xs text-[#9ca3af]">
              Gestiona estructuras de carpetas y archivos con referencias relativas para el MiniBrowser
            </p>
          </div>
        </div>

        {/* Database selector & New Root button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#25282c] border border-[#373a40] rounded-xl px-3 py-1.5 text-xs">
            <Database className="w-3.5 h-3.5 text-[#9ca3af]" />
            <span className="text-[#9ca3af] text-[11px] font-medium">BD:</span>
            <select
              value={selectedDb}
              onChange={(e) => onSelectDatabase(e.target.value)}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
            >
              {databases.map((db) => (
                <option key={db} value={db} className="bg-[#1e1f22] text-white">
                  {db} {db === activeDbName ? '★ (Activa)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setNewRootName('');
              setNewRootDescription('');
              setShowNewRootModal(true);
            }}
            className="px-3.5 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Raíz</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Roots list & Navigation */}
        <div className="w-72 border-r border-[#2f3136] bg-[#18191c] flex flex-col shrink-0">
          {/* Section: Roots in Database */}
          <div className="p-3 border-b border-[#2f3136] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
              Raíces ({roots.length})
            </span>
            <button
              onClick={() => {
                setNewRootName('');
                setShowNewRootModal(true);
              }}
              title="Añadir nueva raíz"
              className="p-1 hover:bg-[#25282c] rounded text-[#9ca3af] hover:text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Roots List */}
          <div className="overflow-y-auto max-h-48 border-b border-[#2f3136] p-2 space-y-1">
            {roots.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#9ca3af]">
                <p>No hay raíces creadas en esta BD.</p>
                <button
                  onClick={() => setShowNewRootModal(true)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  + Establecer primera Raíz
                </button>
              </div>
            ) : (
              roots.map((r) => {
                const isSelected = r.id === selectedRootId;
                const libUrl = `lib://${r.name}`;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRootId(r.id);
                      setSelectedNodePath('/');
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-[#2b2d31] border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-[#1e1f22] border-[#2f3136] hover:bg-[#25282c] text-[#cbd5e1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderTree className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-[#9ca3af]'}`} />
                        <span className="font-bold text-xs truncate text-white">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                            r.syncMode === 'linked'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {r.syncMode === 'linked' ? 'Vinculada' : 'Estática'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#9ca3af]">
                      <span className="font-mono">{r.fileCount || 0} archivos</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyUrl(libUrl);
                          }}
                          title={`Copiar URL: ${libUrl}`}
                          className="p-1 hover:bg-white/10 rounded text-[#9ca3af] hover:text-white"
                        >
                          {copiedUrl === libUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoot(r.id, r.name);
                          }}
                          title="Eliminar raíz"
                          className="p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded text-[#9ca3af]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section: File Tree for selected root */}
          {activeRoot ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[#2f3136] flex items-center justify-between bg-[#141517]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-white truncate">
                    {activeRoot.name} / Árbol
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setCreateNodeType('folder');
                      setCreateNodeParentPath(selectedNode?.type === 'folder' ? selectedNode.path : getParentPath(selectedNodePath));
                      setCreateNodeName('');
                      setShowCreateNodeModal(true);
                    }}
                    title="Nueva Carpeta"
                    className="p-1 hover:bg-[#25282c] rounded text-[#9ca3af] hover:text-white cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCreateNodeType('file');
                      setCreateNodeParentPath(selectedNode?.type === 'folder' ? selectedNode.path : getParentPath(selectedNodePath));
                      setCreateNodeName('');
                      setShowCreateNodeModal(true);
                    }}
                    title="Nuevo Archivo"
                    className="p-1 hover:bg-[#25282c] rounded text-[#9ca3af] hover:text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRefreshActiveRoot}
                    disabled={isRefreshing}
                    title="Refrescar raíz"
                    className="p-1 hover:bg-[#25282c] rounded text-[#9ca3af] hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tree View */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {renderTreeNode(activeRoot.tree, 0)}
              </div>

              {/* Quick actions in tree footer */}
              <div className="p-2 border-t border-[#2f3136] bg-[#141517] flex items-center justify-between text-[11px]">
                <span className="text-[#9ca3af]">
                  {activeRoot.fileCount || 0} archivos ({activeRoot.totalSizeBytes ? `${(activeRoot.totalSizeBytes / 1024).toFixed(1)} KB` : '0 KB'})
                </span>
                <button
                  onClick={() => folderUploadInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Cargar carpeta</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-[#9ca3af]">
              Selecciona o crea una Raíz para explorar sus archivos.
            </div>
          )}
        </div>

        {/* Right Column: Node Details, File Editor & Live Preview */}
        <div className="flex-1 flex flex-col bg-[#1e1f22] overflow-hidden">
          {activeRoot ? (
            <>
              {/* Node Header & Actions Toolbar */}
              <div className="px-5 py-3 border-b border-[#2f3136] bg-[#2b2d31] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[#1e1f22] border border-[#373a40]">
                    {selectedNode?.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FileCode className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white truncate">
                        {selectedNodePath}
                      </span>
                      {selectedNode?.type === 'file' && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          {selectedNode.mimeType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                      <span>URL MiniBrowser:</span>
                      <code className="text-emerald-400 font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded">
                        lib://{activeRoot.name}{selectedNodePath === '/' ? '' : selectedNodePath}
                      </code>
                      <button
                        onClick={() => handleCopyUrl(`lib://${activeRoot.name}${selectedNodePath === '/' ? '' : selectedNodePath}`)}
                        className="hover:text-white cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedUrl === `lib://${activeRoot.name}${selectedNodePath === '/' ? '' : selectedNodePath}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2">
                  {selectedNode?.type === 'folder' ? (
                    <>
                      <button
                        onClick={() => {
                          setCreateNodeType('file');
                          setCreateNodeParentPath(selectedNode.path);
                          setCreateNodeName('');
                          setShowCreateNodeModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#373a40] hover:bg-[#40444b] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Archivo</span>
                      </button>
                      <button
                        onClick={() => {
                          setCreateNodeType('folder');
                          setCreateNodeParentPath(selectedNode.path);
                          setCreateNodeName('');
                          setShowCreateNodeModal(true);
                        }}
                        className="px-3 py-1.5 bg-[#373a40] hover:bg-[#40444b] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Añadir Subcarpeta</span>
                      </button>
                      <button
                        onClick={() => filesUploadInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Archivos</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Segmented View Mode: Previsualización | Dividido | Código */}
                      <div className="flex items-center bg-[#1e1f22] p-0.5 rounded-lg border border-[#373a40] text-xs">
                        <button
                          type="button"
                          onClick={() => setFileViewMode('preview')}
                          className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition cursor-pointer ${
                            fileViewMode === 'preview'
                              ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                              : 'text-[#9ca3af] hover:text-white'
                          }`}
                          title="Panel de previsualización del contenido"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Previsualización</span>
                        </button>

                        {isTextMimeType(selectedNode?.mimeType || '', selectedNode?.name) && (
                          <>
                            <button
                              type="button"
                              onClick={() => setFileViewMode('split')}
                              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition cursor-pointer ${
                                fileViewMode === 'split'
                                  ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                                  : 'text-[#9ca3af] hover:text-white'
                              }`}
                              title="Vista dividida: Código a la izquierda y Previsualización a la derecha"
                            >
                              <Columns className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Dividido</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFileViewMode('code')}
                              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition cursor-pointer ${
                                fileViewMode === 'code'
                                  ? 'bg-[#5865f2] text-white shadow-xs font-semibold'
                                  : 'text-[#9ca3af] hover:text-white'
                              }`}
                              title="Editor de código fuente"
                            >
                              <Code className="w-3.5 h-3.5" />
                              <span>Código</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Edit / Save buttons for text files */}
                      {isTextMimeType(selectedNode?.mimeType || '', selectedNode?.name) && (
                        <>
                          {isEditingFile ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditorFileContent(selectedNode?.content || '');
                                  setIsEditingFile(false);
                                  setHasUnsavedChanges(false);
                                }}
                                className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs font-medium transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveFileContent}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Guardar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingFile(true);
                                if (fileViewMode === 'preview') setFileViewMode('split');
                              }}
                              className="px-3 py-1 bg-[#373a40] hover:bg-[#40444b] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              title="Editar contenido"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                          )}
                        </>
                      )}

                      {selectedNodePath !== '/' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(selectedNodePath, selectedNode?.name || '')}
                          className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Node Content Area */}
              <div className="flex-1 overflow-auto p-5">
                {!selectedNode ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#9ca3af]">
                    <FileText className="w-12 h-12 text-[#64748b] mb-3 opacity-60" />
                    <p className="text-sm font-medium text-slate-300">Ningún elemento seleccionado</p>
                    <p className="text-xs text-[#9ca3af] mt-1">Selecciona una carpeta o archivo del explorador lateral para interactuar.</p>
                  </div>
                ) : selectedNode.type === 'folder' ? (
                  /* Folder details & items grid */
                  <div className="max-w-4xl mx-auto space-y-5">
                    {/* Folder Info Banner */}
                    <div className="p-4 rounded-xl bg-[#2b2d31] border border-[#373a40] flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>📁 Contenido de:</span>
                          <span className="font-mono text-indigo-400">{selectedNode.path}</span>
                        </h3>
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          {selectedNode.children ? selectedNode.children.length : 0} elemento(s) contenidos en esta carpeta
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => filesUploadInputRef.current?.click()}
                          className="px-3 py-1.5 bg-[#373a40] hover:bg-[#40444b] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir a esta carpeta</span>
                        </button>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="bg-[#18191c] border border-[#2f3136] rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#141517] text-[#9ca3af] border-b border-[#2f3136]">
                          <tr>
                            <th className="p-3 font-semibold">Nombre</th>
                            <th className="p-3 font-semibold">Tipo</th>
                            <th className="p-3 font-semibold text-right">Tamaño</th>
                            <th className="p-3 font-semibold text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2f3136]">
                          {selectedNode.children && selectedNode.children.length > 0 ? (
                            selectedNode.children.map((child) => (
                              <tr
                                key={child.id}
                                onClick={() => setSelectedNodePath(child.path)}
                                className="hover:bg-[#25282c] cursor-pointer transition group"
                              >
                                <td className="p-3 flex items-center gap-2 text-white font-medium">
                                  {child.type === 'folder' ? (
                                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                  )}
                                  <span className="font-mono">{child.name}</span>
                                </td>
                                <td className="p-3 text-[#9ca3af]">
                                  {child.type === 'folder' ? 'Carpeta' : child.mimeType}
                                </td>
                                <td className="p-3 text-right font-mono text-[#9ca3af]">
                                  {child.type === 'folder'
                                    ? `${child.children ? child.children.length : 0} items`
                                    : (child.size > 1024 ? `${(child.size / 1024).toFixed(1)} KB` : `${child.size} B`)}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                                    {child.type === 'file' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNodePath(child.path);
                                          setFileViewMode('preview');
                                        }}
                                        title="Previsualizar contenido del archivo"
                                        className="p-1 hover:bg-[#373a40] rounded text-[#9ca3af] hover:text-indigo-400 cursor-pointer transition"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyUrl(`lib://${activeRoot.name}${child.path}`);
                                      }}
                                      title="Copiar URL lib://"
                                      className="p-1 hover:bg-[#373a40] rounded text-[#9ca3af] hover:text-white cursor-pointer transition"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNode(child.path, child.name);
                                      }}
                                      title="Eliminar"
                                      className="p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded text-[#9ca3af] cursor-pointer transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-[#9ca3af]">
                                Esta carpeta está vacía. Puedes crear archivos o subir contenido local.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* File Content: Previsualización / Split / Code Editor */
                  <div className="h-full flex flex-col overflow-hidden">
                    {/* Mode 1: Previsualización completa */}
                    {fileViewMode === 'preview' && (
                      <FilePreviewPanel
                        node={selectedNode}
                        activeRoot={activeRoot}
                        liveContent={editorFileContent}
                        hasUnsavedChanges={hasUnsavedChanges}
                        onCopyUrl={handleCopyUrl}
                        copiedUrl={copiedUrl}
                      />
                    )}

                    {/* Mode 2: Vista Dividida (Código a la izquierda, Previsualización en vivo a la derecha) */}
                    {fileViewMode === 'split' && (
                      <div className="flex-1 flex overflow-hidden gap-3">
                        {/* Left column: Editor */}
                        <div className="w-1/2 flex flex-col bg-[#18191c] rounded-xl border border-[#2f3136] overflow-hidden">
                          <div className="px-3.5 py-2 bg-[#141517] border-b border-[#2f3136] flex items-center justify-between text-xs text-[#9ca3af]">
                            <div className="flex items-center gap-2">
                              <Code className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-mono text-white text-xs font-semibold">{selectedNode?.name}</span>
                              {hasUnsavedChanges && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-medium">
                                  Modificado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span>{editorFileContent.length} chars</span>
                              <span>{editorFileContent.split('\n').length} líneas</span>
                            </div>
                          </div>

                          <div className="flex-1 flex overflow-hidden">
                            {/* Line numbers */}
                            <div className="w-10 py-3 bg-[#141517] text-right pr-2.5 select-none text-[11px] font-mono text-[#64748b] leading-5 border-r border-[#2f3136] overflow-hidden">
                              {editorFileContent.split('\n').map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>

                            {/* Editor textarea */}
                            <textarea
                              value={editorFileContent}
                              onChange={(e) => {
                                setEditorFileContent(e.target.value);
                                setHasUnsavedChanges(true);
                                if (!isEditingFile) setIsEditingFile(true);
                              }}
                              className="flex-1 p-3 bg-transparent text-white font-mono text-xs leading-5 outline-none resize-none overflow-auto"
                              placeholder="Escribe código aquí..."
                              spellCheck={false}
                            />
                          </div>

                          {isEditingFile && (
                            <div className="p-2.5 bg-[#141517] border-t border-[#2f3136] flex items-center justify-between text-xs">
                              <span className="text-amber-400 text-[11px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Previsualizando cambios en vivo</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorFileContent(selectedNode?.content || '');
                                    setIsEditingFile(false);
                                    setHasUnsavedChanges(false);
                                  }}
                                  className="px-2.5 py-1 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs font-semibold transition cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveFileContent}
                                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Guardar</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right column: Previsualización Panel */}
                        <div className="w-1/2 flex flex-col overflow-hidden">
                          <FilePreviewPanel
                            node={selectedNode}
                            activeRoot={activeRoot}
                            liveContent={editorFileContent}
                            hasUnsavedChanges={hasUnsavedChanges}
                            onCopyUrl={handleCopyUrl}
                            copiedUrl={copiedUrl}
                          />
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Editor de código completo */}
                    {fileViewMode === 'code' && (
                      <div className="flex-1 flex flex-col bg-[#18191c] rounded-xl border border-[#2f3136] overflow-hidden">
                        <div className="px-4 py-2.5 bg-[#141517] border-b border-[#2f3136] flex items-center justify-between text-xs text-[#9ca3af]">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4 text-indigo-400" />
                            <span className="font-mono text-white text-sm font-semibold">{selectedNode?.name}</span>
                            {hasUnsavedChanges && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
                                Cambios sin guardar
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span>{editorFileContent.length} caracteres</span>
                            <span>{editorFileContent.split('\n').length} líneas</span>
                          </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                          {/* Line numbers */}
                          <div className="w-12 py-3 bg-[#141517] text-right pr-3 select-none text-[11px] font-mono text-[#64748b] leading-5 border-r border-[#2f3136] overflow-hidden">
                            {editorFileContent.split('\n').map((_, i) => (
                              <div key={i}>{i + 1}</div>
                            ))}
                          </div>

                          {/* Editor textarea */}
                          <textarea
                            value={editorFileContent}
                            readOnly={!isEditingFile}
                            onChange={(e) => {
                              setEditorFileContent(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                            className={`flex-1 p-3 bg-transparent text-white font-mono text-xs leading-5 outline-none resize-none overflow-auto ${
                              !isEditingFile ? 'cursor-default text-[#cbd5e1]' : 'text-white'
                            }`}
                            placeholder="Contenido del archivo..."
                            spellCheck={false}
                          />
                        </div>

                        {isEditingFile && (
                          <div className="p-3 bg-[#141517] border-t border-[#2f3136] flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditorFileContent(selectedNode?.content || '');
                                setIsEditingFile(false);
                                setHasUnsavedChanges(false);
                              }}
                              className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveFileContent}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Guardar Archivo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#9ca3af]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <FolderTree className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Ninguna Raíz Seleccionada</h3>
              <p className="text-xs max-w-md text-[#9ca3af] mb-4">
                Establece un elemento Raíz asociado a la base de datos <strong>{selectedDb}</strong> para gestionar archivos y visualizarlos en el MiniBrowser.
              </p>
              <button
                onClick={() => setShowNewRootModal(true)}
                className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nueva Raíz de Librería</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Establecer Nueva Raíz */}
      {showNewRootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e1f22] border border-[#373a40] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Establecer Nueva Raíz de Librería</h3>
                  <p className="text-xs text-[#9ca3af]">Asociada a la base de datos: {selectedDb}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewRootModal(false)}
                className="p-1.5 hover:bg-[#25282c] rounded-lg text-[#9ca3af] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[#9ca3af] font-semibold mb-1">
                  Nombre de la Raíz (alias en MiniBrowser)
                </label>
                <input
                  type="text"
                  value={newRootName}
                  onChange={(e) => setNewRootName(e.target.value)}
                  placeholder="ej. web, assets, docs, public"
                  className="w-full bg-[#25282c] border border-[#373a40] focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono outline-none text-xs"
                />
                <p className="text-[11px] text-[#64748b] mt-1">
                  Se accederá en el MiniBrowser como: <code className="text-indigo-400">lib://{newRootName || 'nombre'}/</code>
                </p>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold mb-1">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={newRootDescription}
                  onChange={(e) => setNewRootDescription(e.target.value)}
                  placeholder="Descripción para identificar el propósito de esta raíz..."
                  className="w-full bg-[#25282c] border border-[#373a40] focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none text-xs"
                />
              </div>

              {/* Sync Mode: Estática vs Vinculada */}
              <div>
                <label className="block text-[#9ca3af] font-semibold mb-2">
                  Tipo de Sincronización
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setNewRootSyncMode('static')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                      newRootSyncMode === 'static'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white'
                        : 'bg-[#25282c] border-[#373a40] text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>📁 Copia Estática</span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-relaxed">
                      Los archivos residen directamente en la base de datos IndexedDB de forma autónoma.
                    </p>
                  </div>

                  <div
                    onClick={() => setNewRootSyncMode('linked')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                      newRootSyncMode === 'linked'
                        ? 'bg-indigo-500/15 border-indigo-500 text-white'
                        : 'bg-[#25282c] border-[#373a40] text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🔗 Copia Vinculada</span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-relaxed">
                      Vinculada a carpeta o fuente local con capacidad de refresco y sincronización.
                    </p>
                  </div>
                </div>
              </div>

              {/* If Linked: Refresh options */}
              {newRootSyncMode === 'linked' && (
                <div className="p-3 bg-[#25282c] rounded-xl border border-[#373a40] space-y-3">
                  <span className="block font-bold text-white text-[11px]">
                    Opciones de Refresco para Copia Vinculada:
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="refreshMode"
                        checked={newRootRefreshMode === 'manual'}
                        onChange={() => setNewRootRefreshMode('manual')}
                        className="text-indigo-600"
                      />
                      <span>Bajo Demanda (Manual)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="refreshMode"
                        checked={newRootRefreshMode === 'scheduled'}
                        onChange={() => setNewRootRefreshMode('scheduled')}
                        className="text-indigo-600"
                      />
                      <span>Programado (Automático)</span>
                    </label>
                  </div>

                  {newRootRefreshMode === 'scheduled' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] text-[#9ca3af]">Intervalo de refresco:</span>
                      <select
                        value={newRootInterval}
                        onChange={(e) => setNewRootInterval(Number(e.target.value))}
                        className="bg-[#1e1f22] border border-[#373a40] rounded-lg px-2 py-1 text-white text-xs"
                      >
                        <option value={5}>Cada 5 segundos</option>
                        <option value={10}>Cada 10 segundos</option>
                        <option value={30}>Cada 30 segundos</option>
                        <option value={60}>Cada 1 minuto</option>
                        <option value={300}>Cada 5 minutos</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#373a40]">
                    <button
                      type="button"
                      onClick={handlePickLocalDirectoryLink}
                      className="w-full py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Vincular con Carpeta Local del Ordenador</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Initial template selection */}
              <div>
                <label className="block text-[#9ca3af] font-semibold mb-1">
                  Estructura Inicial
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="initTemplate"
                      checked={newRootTemplate === 'web-app'}
                      onChange={() => setNewRootTemplate('web-app')}
                      className="text-indigo-600"
                    />
                    <span>Demo Web (index.html, style.css, script.js, about.html)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="initTemplate"
                      checked={newRootTemplate === 'blank'}
                      onChange={() => setNewRootTemplate('blank')}
                      className="text-indigo-600"
                    />
                    <span>Carpeta Vacía</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2f3136] bg-[#1a1b1e] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewRootModal(false)}
                className="px-4 py-2 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRoot}
                disabled={!newRootName.trim()}
                className="px-5 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Raíz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Archivo o Carpeta */}
      {showCreateNodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1e1f22] border border-[#373a40] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {createNodeType === 'folder' ? (
                  <>
                    <FolderPlus className="w-4 h-4 text-amber-400" />
                    <span>Nueva Carpeta</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span>Nuevo Archivo</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowCreateNodeModal(false)}
                className="p-1 hover:bg-[#25282c] rounded text-[#9ca3af] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-[#9ca3af] block mb-1">Ubicación:</span>
                <div className="font-mono text-xs bg-[#25282c] px-3 py-1.5 rounded-lg border border-[#373a40] text-indigo-300">
                  {createNodeParentPath}
                </div>
              </div>

              <div>
                <label className="block text-[#9ca3af] font-semibold mb-1">
                  Nombre {createNodeType === 'folder' ? 'de la Carpeta' : 'del Archivo (con extensión ej: .html, .css, .js)'}:
                </label>
                <input
                  type="text"
                  value={createNodeName}
                  onChange={(e) => setCreateNodeName(e.target.value)}
                  placeholder={createNodeType === 'folder' ? 'ej. assets' : 'ej. index.html'}
                  className="w-full bg-[#25282c] border border-[#373a40] focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono outline-none text-xs"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#2f3136] bg-[#1a1b1e] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateNodeModal(false)}
                className="px-4 py-2 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNode}
                disabled={!createNodeName.trim()}
                className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
