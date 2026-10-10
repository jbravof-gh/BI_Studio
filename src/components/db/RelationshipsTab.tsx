import React, { useState, useEffect } from 'react';
import { DatabaseInfo, TableRelationship } from '../../types';
import { dexieManager } from '../../services/dexieManager';
import {
  Link2,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  Database,
  Table as TableIcon,
  Check,
  X,
  Play,
  Layers,
  Search,
  Sparkles,
  GitFork,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface RelationshipsTabProps {
  selectedDb: string;
  onNotification: (notif: { type: 'success' | 'error'; text: string }) => void;
  onDbChanged: () => void;
}

export const RelationshipsTab: React.FC<RelationshipsTabProps> = ({
  selectedDb,
  onNotification,
  onDbChanged
}) => {
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sourceTable, setSourceTable] = useState('');
  const [sourceField, setSourceField] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [targetField, setTargetField] = useState('');
  const [relType, setRelType] = useState<TableRelationship['type']>('many-to-one');
  const [description, setDescription] = useState('');

  // Live Join Preview State
  const [previewRel, setPreviewRel] = useState<TableRelationship | null>(null);
  const [joinedRecords, setJoinedRecords] = useState<Record<string, any>[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [relToDelete, setRelToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDb) {
      loadData(selectedDb);
    }
  }, [selectedDb]);

  const loadData = async (dbName: string) => {
    setLoading(true);
    try {
      const [info, rels] = await Promise.all([
        dexieManager.getDatabaseInfo(dbName),
        dexieManager.getRelationships(dbName)
      ]);
      setDbInfo(info);
      setRelationships(rels);

      if (info && info.tables.length > 0) {
        if (!sourceTable) setSourceTable(info.tables[0].name);
        if (!targetTable && info.tables.length > 1) setTargetTable(info.tables[1].name);
      }
    } catch (e: any) {
      console.error(e);
      onNotification({ type: 'error', text: 'Error al cargar relaciones: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  const getFieldsForTable = (tableName: string): string[] => {
    const tbl = dbInfo?.tables.find(t => t.name === tableName);
    if (!tbl) return [];
    if (tbl.fields && tbl.fields.length > 0) return tbl.fields;
    if (tbl.sampleRecord) return Object.keys(tbl.sampleRecord);
    return ['id'];
  };

  useEffect(() => {
    if (sourceTable) {
      const fields = getFieldsForTable(sourceTable);
      if (fields.length > 0 && !fields.includes(sourceField)) {
        setSourceField(fields[0]);
      }
    }
  }, [sourceTable]);

  useEffect(() => {
    if (targetTable) {
      const fields = getFieldsForTable(targetTable);
      if (fields.length > 0 && !fields.includes(targetField)) {
        setTargetField(fields[0]);
      }
    }
  }, [targetTable]);

  const handleOpenAdd = () => {
    setEditingRelId(null);
    if (dbInfo && dbInfo.tables.length >= 2) {
      setSourceTable(dbInfo.tables[0].name);
      setTargetTable(dbInfo.tables[1].name);
      setName(`${dbInfo.tables[0].name}_a_${dbInfo.tables[1].name}`);
    } else if (dbInfo && dbInfo.tables.length === 1) {
      setSourceTable(dbInfo.tables[0].name);
      setTargetTable(dbInfo.tables[0].name);
      setName(`auto_${dbInfo.tables[0].name}`);
    }
    setDescription('');
    setRelType('many-to-one');
    setShowForm(true);
  };

  const handleOpenEdit = (rel: TableRelationship) => {
    setEditingRelId(rel.id);
    setName(rel.name);
    setSourceTable(rel.sourceTable);
    setSourceField(rel.sourceField);
    setTargetTable(rel.targetTable);
    setTargetField(rel.targetField);
    setRelType(rel.type);
    setDescription(rel.description || '');
    setShowForm(true);
  };

  const handleSaveRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceTable || !sourceField || !targetTable || !targetField) {
      onNotification({ type: 'error', text: 'Por favor completa todos los campos requeridos.' });
      return;
    }

    const rel: TableRelationship = {
      id: editingRelId || `rel_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      sourceTable,
      sourceField,
      targetTable,
      targetField,
      type: relType,
      description: description.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await dexieManager.saveRelationship(selectedDb, rel);
      onNotification({
        type: 'success',
        text: `Relación "${rel.name}" ${editingRelId ? 'actualizada' : 'guardada'} exitosamente.`
      });
      setShowForm(false);
      setEditingRelId(null);
      await loadData(selectedDb);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al guardar relación.' });
    }
  };

  const handleDeleteRelationship = (relId: string) => {
    setRelToDelete(relId);
  };

  const handleConfirmDeleteRelationship = async () => {
    if (!relToDelete) return;
    const targetId = relToDelete;
    try {
      await dexieManager.deleteRelationship(selectedDb, targetId);
      onNotification({ type: 'success', text: 'Relación eliminada.' });
      if (previewRel?.id === targetId) setPreviewRel(null);
      setRelToDelete(null);
      await loadData(selectedDb);
      onDbChanged();
    } catch (err: any) {
      onNotification({ type: 'error', text: err.message || 'Error al eliminar relación.' });
    }
  };

  const handlePreviewJoin = async (rel: TableRelationship) => {
    setPreviewRel(rel);
    setIsPreviewLoading(true);
    try {
      const [sourceRecords, targetRecords] = await Promise.all([
        dexieManager.getTableRecords(selectedDb, rel.sourceTable, { limit: 50 }),
        dexieManager.getTableRecords(selectedDb, rel.targetTable, { limit: 100 })
      ]);

      const joined = sourceRecords.map(srcRow => {
        const srcVal = srcRow[rel.sourceField];
        const match = targetRecords.find(tgtRow => String(tgtRow[rel.targetField]) === String(srcVal));
        return {
          __source_key: `${rel.sourceTable}.${rel.sourceField} = ${srcVal ?? 'NULL'}`,
          ...srcRow,
          _MATCHED_TARGET: match ? match : null
        };
      });

      setJoinedRecords(joined);
    } catch (e: any) {
      onNotification({ type: 'error', text: 'Error al probar join: ' + e.message });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const getTypeBadge = (type: TableRelationship['type']) => {
    switch (type) {
      case 'one-to-one':
        return <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">1:1 Uno a Uno</span>;
      case 'one-to-many':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">1:N Uno a Varios</span>;
      case 'many-to-one':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">N:1 Varios a Uno</span>;
      case 'many-to-many':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">N:M Muchos a Muchos</span>;
      case 'lookup':
      default:
        return <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold">Lookup / Enriquecimiento</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e2024] overflow-hidden text-[#e1e1e6]">
      {/* Header bar */}
      <div className="px-6 py-3 border-b border-[#2f3136] bg-[#1a1b1e] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Relaciones entre Tablas</span>
              <span className="px-2 py-0.5 rounded-full bg-[#25282c] border border-[#2f3136] text-[10px] text-[#9ca3af]">
                BD: {selectedDb}
              </span>
            </h3>
            <p className="text-xs text-[#9ca3af]">
              Define claves foráneas y vínculos relacionales para vincular componentes y controles visuales del Canvas.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Relación</span>
        </button>
      </div>

      {/* Main Body Split */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Add / Edit Form Modal / Box */}
          {showForm && (
            <div className="p-5 bg-[#25282c] border border-[#5865f2]/40 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-3">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#5865f2]" />
                  <span>{editingRelId ? 'Editar Relación' : 'Definir Nueva Relación entre Tablas'}</span>
                </div>
                <button onClick={() => setShowForm(false)} className="text-[#9ca3af] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRelationship} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#9ca3af] block mb-1">Nombre / Identificador de la Relación:</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ej: pedidos_a_clientes"
                      className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-white focus:outline-none focus:border-[#5865f2]"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#9ca3af] block mb-1">Tipo de Relación:</label>
                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-white focus:outline-none focus:border-[#5865f2]"
                    >
                      <option value="many-to-one">Muchos a Uno (N:1) - ej: Pedidos a Cliente</option>
                      <option value="one-to-many">Uno a Muchos (1:N) - ej: Cliente a Pedidos</option>
                      <option value="one-to-one">Uno a Uno (1:1) - ej: Usuario a Perfil</option>
                      <option value="many-to-many">Muchos a Muchos (N:M)</option>
                      <option value="lookup">Lookup / Búsqueda Enriquecida</option>
                    </select>
                  </div>
                </div>

                {/* Source and Target mapping boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-[#1a1b1e] border border-[#2f3136] rounded-xl">
                  {/* Source Table & Field */}
                  <div className="space-y-2">
                    <div className="font-bold text-[#5865f2] flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Tabla Origen (Foreing Key / Clave)</span>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9ca3af] block mb-0.5">Tabla:</label>
                      <select
                        value={sourceTable}
                        onChange={(e) => setSourceTable(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md text-white text-xs"
                      >
                        {dbInfo?.tables.map((t, idx) => (
                          <option key={`src_tbl_opt_${t.name}_${idx}`} value={t.name}>
                            {t.name} ({t.recordCount} filas)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9ca3af] block mb-0.5">Campo / Columna Origen:</label>
                      <select
                        value={sourceField}
                        onChange={(e) => setSourceField(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md text-white text-xs font-mono"
                      >
                        {getFieldsForTable(sourceTable).map((f, idx) => (
                          <option key={`src_fld_opt_${f}_${idx}`} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Table & Field */}
                  <div className="space-y-2">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Tabla Destino (Primary Key / Referenciada)</span>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9ca3af] block mb-0.5">Tabla:</label>
                      <select
                        value={targetTable}
                        onChange={(e) => setTargetTable(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md text-white text-xs"
                      >
                        {dbInfo?.tables.map((t, idx) => (
                          <option key={`tgt_tbl_opt_${t.name}_${idx}`} value={t.name}>
                            {t.name} ({t.recordCount} filas)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9ca3af] block mb-0.5">Campo / Columna Destino:</label>
                      <select
                        value={targetField}
                        onChange={(e) => setTargetField(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#25282c] border border-[#2f3136] rounded-md text-white text-xs font-mono"
                      >
                        {getFieldsForTable(targetTable).map((f, idx) => (
                          <option key={`tgt_fld_opt_${f}_${idx}`} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#9ca3af] block mb-1">Descripción / Notas (Opcional):</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ej: Conecta cada venta con la ficha del cliente que realizó la compra"
                    className="w-full px-3 py-2 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-white focus:outline-none focus:border-[#5865f2]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-[#1a1b1e] hover:bg-[#2f3136] text-[#9ca3af] rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Relación</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Relationships List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider">
                Relaciones Registradas ({relationships.length})
              </span>
            </div>

            {relationships.length === 0 ? (
              <div className="p-8 border border-dashed border-[#2f3136] bg-[#25282c]/40 rounded-xl text-center space-y-3">
                <Link2 className="w-10 h-10 text-[#9ca3af]/40 mx-auto" />
                <p className="text-xs text-[#9ca3af]">
                  No se han definido relaciones para la base de datos "{selectedDb}".
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 bg-[#5865f2]/20 hover:bg-[#5865f2]/30 text-[#5865f2] border border-[#5865f2]/40 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear la primera relación</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relationships.map((rel, idx) => (
                  <div
                    key={`rel_card_${rel.id}_${idx}`}
                    className="bg-[#25282c] border border-[#2f3136] hover:border-[#5865f2]/40 rounded-xl p-4 space-y-3 shadow-sm transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{rel.name}</span>
                        {getTypeBadge(rel.type)}
                      </div>

                      {/* Connection schema visualization */}
                      <div className="flex items-center justify-between p-2.5 bg-[#1a1b1e] border border-[#2f3136] rounded-lg text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[#9ca3af] font-semibold">{rel.sourceTable}</span>
                          <span className="font-mono text-[#5865f2] font-bold">.{rel.sourceField}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[#9ca3af]">
                          <div className="h-0.5 w-6 bg-[#373a40]" />
                          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                          <div className="h-0.5 w-6 bg-[#373a40]" />
                        </div>

                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-[#9ca3af] font-semibold">{rel.targetTable}</span>
                          <span className="font-mono text-emerald-400 font-bold">.{rel.targetField}</span>
                        </div>
                      </div>

                      {rel.description && (
                        <p className="text-[11px] text-[#9ca3af] italic">
                          {rel.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2f3136] text-xs">
                      <button
                        onClick={() => handlePreviewJoin(rel)}
                        className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Probar Join / Vista Previa</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(rel)}
                          className="p-1.5 text-[#9ca3af] hover:text-white rounded hover:bg-[#1a1b1e]"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRelationship(rel.id)}
                          className="p-1.5 text-[#9ca3af] hover:text-rose-400 rounded hover:bg-rose-500/20"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Join Test Inspector Result */}
          {previewRel && (
            <div className="p-4 bg-[#25282c] border border-purple-500/40 rounded-xl space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#2f3136] pb-2">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-xs">
                    Vista Previa de Join en Vivo: <span className="font-mono text-purple-300">{previewRel.name}</span>
                  </span>
                </div>
                <button onClick={() => setPreviewRel(null)} className="text-[#9ca3af] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isPreviewLoading ? (
                <div className="p-6 text-center text-xs text-[#9ca3af]">Cargando datos relacionales...</div>
              ) : joinedRecords.length > 0 ? (
                <div className="overflow-x-auto max-h-64 border border-[#2f3136] rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1a1b1e] text-[#9ca3af] text-[10px] uppercase font-bold sticky top-0">
                      <tr>
                        <th className="p-2 border-b border-[#2f3136]">Vínculo Clave</th>
                        <th className="p-2 border-b border-[#2f3136]">Fila Origen ({previewRel.sourceTable})</th>
                        <th className="p-2 border-b border-[#2f3136]">Fila Destino Vinculada ({previewRel.targetTable})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2f3136]">
                      {joinedRecords.map((r, i) => (
                        <tr key={`join_prev_${i}`} className="hover:bg-[#202225] font-mono text-[11px]">
                          <td className="p-2 text-purple-300 whitespace-nowrap">{r.__source_key}</td>
                          <td className="p-2 text-[#e1e1e6] max-w-xs truncate">
                            {JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== '__source_key' && k !== '_MATCHED_TARGET')))}
                          </td>
                          <td className="p-2 text-emerald-300 max-w-xs truncate">
                            {r._MATCHED_TARGET ? JSON.stringify(r._MATCHED_TARGET) : <span className="text-rose-400 italic">Sin correspondencia</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#9ca3af] italic">
                  No hay registros para probar el join entre estas dos tablas.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Delete Relationship */}
      {relToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#202225] border border-rose-500/40 rounded-xl shadow-2xl max-w-sm w-full p-4 text-[#e1e1e6] space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Eliminar relación</span>
            </div>
            <p className="text-xs text-[#9ca3af] leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta relación entre tablas de la base de datos?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2f3136]">
              <button
                type="button"
                onClick={() => setRelToDelete(null)}
                className="px-3 py-1.5 bg-[#25282c] hover:bg-[#2f3136] text-[#cbd5e1] rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRelationship}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Relación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
