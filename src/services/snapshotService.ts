import Dexie, { Table } from 'dexie';
import { CanvasSnapshot, CanvasDocument } from '../types';
import { generateCanvasThumbnail } from '../utils/thumbnailGenerator';

class SnapshotDatabase extends Dexie {
  snapshots!: Table<CanvasSnapshot, string>;

  constructor() {
    super('CanvasSnapshotsDB');
    this.version(1).stores({
      snapshots: 'id, docId, dbName, timestamp, createdAt'
    });
  }
}

export const snapshotDb = new SnapshotDatabase();

export const snapshotService = {
  /**
   * Captures the current canvas document state, generates a thumbnail,
   * and saves the snapshot record into IndexedDB.
   */
  async takeSnapshot(
    canvasDoc: CanvasDocument,
    activeDbName: string = '',
    customName?: string
  ): Promise<CanvasSnapshot> {
    const thumbnail = await generateCanvasThumbnail(canvasDoc, 260);
    const now = new Date();
    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const dateFormatted = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const defaultName = `${canvasDoc.name || 'Dashboard'} • ${timeFormatted}`;

    const snapshot: CanvasSnapshot = {
      id,
      docId: canvasDoc.id || 'doc_current',
      docName: customName?.trim() || defaultName,
      dbName: activeDbName || 'global',
      timestamp: Date.now(),
      createdAt: `${dateFormatted} ${timeFormatted}`,
      thumbnail: thumbnail || '',
      elementCount: (canvasDoc.elements || []).length,
      dimensions: {
        width: canvasDoc.width,
        height: canvasDoc.height
      },
      document: JSON.parse(JSON.stringify(canvasDoc)),
      note: customName?.trim() ? customName.trim() : undefined
    };

    await snapshotDb.snapshots.put(snapshot);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas-snapshot-updated', { detail: { type: 'create', snapshot } }));
    }

    return snapshot;
  },

  /**
   * Retrieves all snapshots sorted newest to oldest.
   */
  async getSnapshots(dbName?: string, docId?: string): Promise<CanvasSnapshot[]> {
    try {
      const all = await snapshotDb.snapshots.orderBy('timestamp').reverse().toArray();
      if (docId) {
        return all.filter((s) => s.docId === docId);
      }
      if (dbName) {
        return all.filter((s) => s.dbName === dbName || s.dbName === 'global');
      }
      return all;
    } catch (err) {
      console.error('Failed to load canvas snapshots from IndexedDB:', err);
      return [];
    }
  },

  /**
   * Counts total snapshots available.
   */
  async getSnapshotCount(dbName?: string): Promise<number> {
    try {
      if (dbName) {
        return await snapshotDb.snapshots.where('dbName').equals(dbName).count();
      }
      return await snapshotDb.snapshots.count();
    } catch {
      return 0;
    }
  },

  /**
   * Deletes a single snapshot by ID.
   */
  async deleteSnapshot(id: string): Promise<void> {
    await snapshotDb.snapshots.delete(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas-snapshot-updated', { detail: { type: 'delete', id } }));
    }
  },

  /**
   * Updates the title / name of a snapshot.
   */
  async updateSnapshotName(id: string, newName: string): Promise<void> {
    await snapshotDb.snapshots.update(id, { docName: newName.trim() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas-snapshot-updated', { detail: { type: 'update', id } }));
    }
  },

  /**
   * Clears all snapshots (optionally restricted to a database).
   */
  async clearSnapshots(dbName?: string): Promise<void> {
    if (dbName) {
      const matching = await snapshotDb.snapshots.where('dbName').equals(dbName).toArray();
      await snapshotDb.snapshots.bulkDelete(matching.map((s) => s.id));
    } else {
      await snapshotDb.snapshots.clear();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('canvas-snapshot-updated', { detail: { type: 'clear' } }));
    }
  }
};
