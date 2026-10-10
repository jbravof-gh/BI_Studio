import { useEffect, useMemo, useRef, useCallback } from 'react';
import { CanvasElement, DatabaseInfo } from '../types';

export interface UseFormSchemaRefreshOptions {
  element: CanvasElement | null | undefined;
  dbInfo: DatabaseInfo | null | undefined;
  dbRecords?: Record<string, Record<string, any>[]>;
  onChangeElement?: (updated: CanvasElement) => void;
}

export interface UseFormSchemaRefreshResult {
  availableFields: string[];
  selectedFields: string[];
  hasFields: boolean;
  selectAllFields: () => void;
  deselectAllFields: () => void;
  toggleField: (fieldName: string) => void;
  refreshFields: () => void;
}

/**
 * Hook to automatically refresh and synchronize the available field list in form configuration
 * whenever the user switches the target database table or the table schema is updated.
 */
export function useFormSchemaRefresh({
  element,
  dbInfo,
  dbRecords = {},
  onChangeElement
}: UseFormSchemaRefreshOptions): UseFormSchemaRefreshResult {
  const currentTableName = element?.binding?.tableName;

  // Extract all available fields for the currently targeted table
  const availableFields = useMemo(() => {
    if (!currentTableName || !dbInfo?.tables) return [];

    const tableInfo = dbInfo.tables.find(t => t.name === currentTableName);
    const fieldsSet = new Set<string>();

    // 1. From database tableInfo.fields
    if (tableInfo?.fields && Array.isArray(tableInfo.fields)) {
      tableInfo.fields.forEach(f => f && fieldsSet.add(f));
    }

    // 2. From table sample record
    if (tableInfo?.sampleRecord && typeof tableInfo.sampleRecord === 'object') {
      Object.keys(tableInfo.sampleRecord).forEach(f => f && fieldsSet.add(f));
    }

    // 3. From live in-memory table records
    const records = dbRecords[currentTableName];
    if (records && Array.isArray(records) && records.length > 0) {
      records.forEach(rec => {
        if (rec && typeof rec === 'object') {
          Object.keys(rec).forEach(f => f && fieldsSet.add(f));
        }
      });
    }

    // 4. From table schema index definition (e.g., 'id, nombre, categoria')
    if (tableInfo?.schema) {
      tableInfo.schema
        .split(',')
        .map(s => s.trim().replace(/^&|\*|\+\+/, ''))
        .filter(Boolean)
        .forEach(f => fieldsSet.add(f));
    }

    return Array.from(fieldsSet);
  }, [currentTableName, dbInfo?.tables, dbRecords]);

  const selectedFields = useMemo(() => {
    if (!element?.binding?.columns || !Array.isArray(element.binding.columns)) {
      return [];
    }
    return element.binding.columns.filter(Boolean);
  }, [element?.binding?.columns]);

  // Track table and schema changes
  const prevTableRef = useRef<string | undefined>(currentTableName);
  const isUpdatingRef = useRef<boolean>(false);

  // Synchronize form columns when the table switches or available fields change
  useEffect(() => {
    if (!element || element.type !== 'form' || !onChangeElement) {
      prevTableRef.current = currentTableName;
      return;
    }

    const prevTable = prevTableRef.current;
    const tableChanged = prevTable !== currentTableName;
    prevTableRef.current = currentTableName;

    // Prevent recursive updates if already in sync
    if (isUpdatingRef.current) return;

    if (!currentTableName) {
      if (selectedFields.length > 0) {
        isUpdatingRef.current = true;
        onChangeElement({
          ...element,
          binding: {
            ...element.binding,
            columns: []
          }
        });
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      }
      return;
    }

    // If we have available fields, ensure selected fields only contain valid current schema fields
    if (availableFields.length > 0) {
      const validCols = selectedFields.filter(col => availableFields.includes(col));
      
      const needsCleanup = validCols.length !== selectedFields.length || 
        !selectedFields.every((col, i) => col === validCols[i]);

      if (tableChanged || needsCleanup) {
        isUpdatingRef.current = true;
        onChangeElement({
          ...element,
          binding: {
            ...element.binding,
            columns: validCols
          }
        });
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      }
    }
  }, [element, currentTableName, availableFields, selectedFields, onChangeElement]);

  const selectAllFields = useCallback(() => {
    if (!element || !onChangeElement || availableFields.length === 0) return;
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        columns: [...availableFields]
      }
    });
  }, [element, onChangeElement, availableFields]);

  const deselectAllFields = useCallback(() => {
    if (!element || !onChangeElement) return;
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        columns: []
      }
    });
  }, [element, onChangeElement]);

  const toggleField = useCallback((fieldName: string) => {
    if (!element || !onChangeElement) return;
    const current = Array.isArray(element.binding.columns) ? element.binding.columns : [];
    let nextCols: string[];
    if (current.includes(fieldName)) {
      nextCols = current.filter(f => f !== fieldName);
    } else {
      nextCols = [...current, fieldName];
    }
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        columns: nextCols
      }
    });
  }, [element, onChangeElement]);

  const refreshFields = useCallback(() => {
    if (!element || !onChangeElement || availableFields.length === 0) return;
    const validCols = selectedFields.filter(col => availableFields.includes(col));
    onChangeElement({
      ...element,
      binding: {
        ...element.binding,
        columns: validCols
      }
    });
  }, [element, onChangeElement, availableFields, selectedFields]);

  return {
    availableFields,
    selectedFields,
    hasFields: availableFields.length > 0,
    selectAllFields,
    deselectAllFields,
    toggleField,
    refreshFields
  };
}
