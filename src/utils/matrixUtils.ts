/**
 * Multi-dimensional Matrix (Pivot Table) calculation & hierarchy utilities.
 * Supports multi-level rows, multi-level columns, interactive grouping/ungrouping,
 * hierarchical aggregation, and subtotal calculations.
 */

export interface MatrixRowNode {
  id: string; // Unique path, e.g. "Tecnología" or "Tecnología > Teléfonos"
  level: number;
  value: string;
  field: string;
  path: string[];
  isLeaf: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  children: MatrixRowNode[];
  records: Record<string, any>[];
  cellValues: Record<string, number>;
  rowTotal: number;
}

export interface MatrixColNode {
  id: string; // Unique path, e.g. "2024" or "2024 > Q1"
  level: number;
  value: string;
  field: string;
  path: string[];
  isLeaf: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  children: MatrixColNode[];
  colSpan: number;
  rowSpan: number;
}

export interface MatrixGridModel {
  rowFields: string[];
  colFields: string[];
  valueField?: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max';
  visibleRows: MatrixRowNode[];
  headerRows: MatrixColNode[][];
  visibleLeafCols: MatrixColNode[];
  colTotals: Record<string, number>;
  grandTotal: number;
  maxCellVal: number;
  maxRowLevels: number;
  maxColLevels: number;
  allRowGroupIds: string[];
  allColGroupIds: string[];
  rowGroupsByLevel: Record<number, string[]>;
  colGroupsByLevel: Record<number, string[]>;
}

export interface BuildMatrixParams {
  tableData: Record<string, any>[];
  rowFields: string[];
  colFields: string[];
  valueField?: string;
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  collapsedRows?: Record<string, boolean>;
  collapsedCols?: Record<string, boolean>;
  showSubtotals?: boolean;
  showGrandTotals?: boolean;
  maxRowLeafs?: number;
  maxColLeafs?: number;
}

function aggregateValues(
  records: Record<string, any>[],
  valueField?: string,
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'sum'
): number {
  if (records.length === 0) return 0;
  if (aggregation === 'count') return records.length;

  if (!valueField) {
    return records.length;
  }

  const numbers: number[] = [];
  for (const r of records) {
    const raw = r[valueField];
    if (typeof raw === 'number' && !isNaN(raw)) {
      numbers.push(raw);
    } else if (typeof raw === 'string') {
      const parsed = parseFloat(raw.replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsed)) numbers.push(parsed);
    }
  }

  if (numbers.length === 0) return 0;

  switch (aggregation) {
    case 'sum': {
      return numbers.reduce((acc, n) => acc + n, 0);
    }
    case 'avg': {
      const sum = numbers.reduce((acc, n) => acc + n, 0);
      return Math.round((sum / numbers.length) * 100) / 100;
    }
    case 'min': {
      return Math.min(...numbers);
    }
    case 'max': {
      return Math.max(...numbers);
    }
    default:
      return numbers.reduce((acc, n) => acc + n, 0);
  }
}

/**
 * Builds the hierarchical column tree and computes visible leaf columns and tiered header rows.
 */
function buildColHierarchy(
  tableData: Record<string, any>[],
  colFields: string[],
  collapsedCols: Record<string, boolean>,
  maxColLeafs = 16
): {
  headerRows: MatrixColNode[][];
  visibleLeafCols: MatrixColNode[];
  allColGroupIds: string[];
  colGroupsByLevel: Record<number, string[]>;
} {
  const effectiveColFields = colFields.length > 0 ? colFields : ['_default_col'];
  const maxLevels = effectiveColFields.length;

  // Build root node
  interface RawColTree {
    key: string;
    value: string;
    field: string;
    level: number;
    path: string[];
    children: Map<string, RawColTree>;
  }

  const rootChildren = new Map<string, RawColTree>();

  tableData.forEach((rec) => {
    let currentMap = rootChildren;
    const currentPath: string[] = [];

    effectiveColFields.forEach((f, lvl) => {
      const rawVal = rec[f];
      const val = rawVal !== undefined && rawVal !== null ? String(rawVal) : 'N/A';
      currentPath.push(val);
      const nodeKey = currentPath.join(' > ');

      if (!currentMap.has(val)) {
        currentMap.set(val, {
          key: nodeKey,
          value: val,
          field: f,
          level: lvl,
          path: [...currentPath],
          children: new Map<string, RawColTree>()
        });
      }
      currentMap = currentMap.get(val)!.children;
    });
  });

  const allColGroupIds: string[] = [];
  const colGroupsByLevel: Record<number, string[]> = {};

  // Recursively convert raw tree into MatrixColNode
  function convertColNode(raw: RawColTree): MatrixColNode {
    const isCollapsed = !!collapsedCols[raw.key];
    const hasChildren = raw.children.size > 0;
    const isLeaf = raw.level === maxLevels - 1 || !hasChildren || isCollapsed;

    if (hasChildren) {
      allColGroupIds.push(raw.key);
      if (!colGroupsByLevel[raw.level]) colGroupsByLevel[raw.level] = [];
      colGroupsByLevel[raw.level].push(raw.key);
    }

    const childNodes: MatrixColNode[] = [];
    if (!isCollapsed && hasChildren) {
      Array.from(raw.children.values()).forEach((ch) => {
        childNodes.push(convertColNode(ch));
      });
    }

    return {
      id: raw.key,
      level: raw.level,
      value: raw.value,
      field: raw.field,
      path: raw.path,
      isLeaf,
      hasChildren,
      isCollapsed,
      children: childNodes,
      colSpan: 1,
      rowSpan: 1
    };
  }

  const topNodes: MatrixColNode[] = Array.from(rootChildren.values()).map(convertColNode);

  // Compute visible leaf columns (those that will have actual data cells in the table)
  const visibleLeafCols: MatrixColNode[] = [];
  function collectLeafs(node: MatrixColNode) {
    if (node.isLeaf || node.children.length === 0) {
      visibleLeafCols.push(node);
    } else {
      node.children.forEach(collectLeafs);
    }
  }
  topNodes.forEach(collectLeafs);

  // Cap visible leaf columns to avoid infinite horizontal blowup
  const cappedLeafCols = visibleLeafCols.slice(0, maxColLeafs);
  const allowedLeafIds = new Set(cappedLeafCols.map((c) => c.id));

  // Compute colSpan & rowSpan for each node
  function computeSpans(node: MatrixColNode): number {
    if (node.isLeaf || node.children.length === 0) {
      node.colSpan = 1;
      node.rowSpan = maxLevels - node.level;
      return 1;
    }
    const visibleChildren = node.children.filter((ch) => {
      // Check if child or its descendants are in allowedLeafIds
      function hasAllowed(n: MatrixColNode): boolean {
        if (allowedLeafIds.has(n.id)) return true;
        return n.children.some(hasAllowed);
      }
      return hasAllowed(ch);
    });

    let span = 0;
    visibleChildren.forEach((ch) => {
      span += computeSpans(ch);
    });
    node.colSpan = Math.max(1, span);
    node.rowSpan = 1;
    return node.colSpan;
  }

  topNodes.forEach((tn) => computeSpans(tn));

  // Build tiered header rows for <thead>
  const headerRows: MatrixColNode[][] = [];
  for (let l = 0; l < maxLevels; l++) {
    headerRows.push([]);
  }

  function fillHeaderRows(node: MatrixColNode) {
    // Only include if this node has visible representation
    if (node.level < maxLevels) {
      headerRows[node.level].push(node);
    }
    if (!node.isCollapsed && node.children.length > 0) {
      node.children.forEach(fillHeaderRows);
    }
  }

  topNodes.forEach(fillHeaderRows);

  return {
    headerRows,
    visibleLeafCols: cappedLeafCols,
    allColGroupIds,
    colGroupsByLevel
  };
}

/**
 * Builds the hierarchical row tree, computes cell aggregations, and extracts visible rows.
 */
function buildRowHierarchy(
  tableData: Record<string, any>[],
  rowFields: string[],
  colFields: string[],
  visibleLeafCols: MatrixColNode[],
  valueField?: string,
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' = 'sum',
  collapsedRows: Record<string, boolean> = {},
  showSubtotals = true,
  maxRowLeafs = 100
): {
  visibleRows: MatrixRowNode[];
  allRowGroupIds: string[];
  rowGroupsByLevel: Record<number, string[]>;
  colTotals: Record<string, number>;
  grandTotal: number;
  maxCellVal: number;
} {
  const effectiveRowFields = rowFields.length > 0 ? rowFields : ['_default_row'];
  const maxLevels = effectiveRowFields.length;

  interface RawRowTree {
    key: string;
    value: string;
    field: string;
    level: number;
    path: string[];
    records: Record<string, any>[];
    children: Map<string, RawRowTree>;
  }

  const rootChildren = new Map<string, RawRowTree>();

  tableData.forEach((rec) => {
    let currentMap = rootChildren;
    const currentPath: string[] = [];

    effectiveRowFields.forEach((f, lvl) => {
      const rawVal = rec[f];
      const val = rawVal !== undefined && rawVal !== null ? String(rawVal) : 'N/A';
      currentPath.push(val);
      const nodeKey = currentPath.join(' > ');

      if (!currentMap.has(val)) {
        currentMap.set(val, {
          key: nodeKey,
          value: val,
          field: f,
          level: lvl,
          path: [...currentPath],
          records: [],
          children: new Map<string, RawRowTree>()
        });
      }
      const node = currentMap.get(val)!;
      node.records.push(rec);
      currentMap = node.children;
    });
  });

  const allRowGroupIds: string[] = [];
  const rowGroupsByLevel: Record<number, string[]> = {};
  let maxCellVal = 1;

  function convertRowNode(raw: RawRowTree): MatrixRowNode {
    const isCollapsed = !!collapsedRows[raw.key];
    const hasChildren = raw.children.size > 0;
    const isLeaf = raw.level === maxLevels - 1 || !hasChildren;

    if (hasChildren) {
      allRowGroupIds.push(raw.key);
      if (!rowGroupsByLevel[raw.level]) rowGroupsByLevel[raw.level] = [];
      rowGroupsByLevel[raw.level].push(raw.key);
    }

    // Compute cell values for each visible leaf column
    const cellValues: Record<string, number> = {};
    let rowTotal = 0;

    visibleLeafCols.forEach((col) => {
      // Filter raw.records matching col path
      const matching = raw.records.filter((r) => {
        for (let l = 0; l <= col.level; l++) {
          const colField = colFields[l];
          if (colField) {
            const rVal = r[colField] !== undefined && r[colField] !== null ? String(r[colField]) : 'N/A';
            if (rVal !== col.path[l]) {
              return false;
            }
          }
        }
        return true;
      });

      const cellVal = aggregateValues(matching, valueField, aggregation);
      cellValues[col.id] = cellVal;
      rowTotal += cellVal;
      if (cellVal > maxCellVal) maxCellVal = cellVal;
    });

    const childNodes: MatrixRowNode[] = [];
    Array.from(raw.children.values()).forEach((ch) => {
      childNodes.push(convertRowNode(ch));
    });

    return {
      id: raw.key,
      level: raw.level,
      value: raw.value,
      field: raw.field,
      path: raw.path,
      isLeaf,
      hasChildren,
      isCollapsed,
      children: childNodes,
      records: raw.records,
      cellValues,
      rowTotal
    };
  }

  const topNodes: MatrixRowNode[] = Array.from(rootChildren.values()).map(convertRowNode);

  // Flatten visible rows according to collapsedRows
  const visibleRows: MatrixRowNode[] = [];

  function collectVisibleRows(node: MatrixRowNode) {
    if (visibleRows.length >= maxRowLeafs) return;

    visibleRows.push(node);

    if (!node.isCollapsed && node.children.length > 0) {
      node.children.forEach(collectVisibleRows);
    }
  }

  topNodes.forEach(collectVisibleRows);

  // Calculate column totals across root rows to avoid double counting subtotals
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  visibleLeafCols.forEach((col) => {
    let sum = 0;
    topNodes.forEach((topNode) => {
      sum += topNode.cellValues[col.id] || 0;
    });
    colTotals[col.id] = sum;
    grandTotal += sum;
  });

  return {
    visibleRows,
    allRowGroupIds,
    rowGroupsByLevel,
    colTotals,
    grandTotal,
    maxCellVal
  };
}

/**
 * Main entrance to build the full multidimensional matrix model.
 */
export function buildMatrixGridModel(params: BuildMatrixParams): MatrixGridModel {
  const {
    tableData = [],
    rowFields = [],
    colFields = [],
    valueField,
    aggregation = 'sum',
    collapsedRows = {},
    collapsedCols = {},
    showSubtotals = true,
    maxRowLeafs = 120,
    maxColLeafs = 16
  } = params;

  // Fallbacks if empty
  const sanitizedRowFields = (rowFields || []).filter(Boolean);
  const sanitizedColFields = (colFields || []).filter(Boolean);

  const effectiveRowFields =
    sanitizedRowFields.length > 0
      ? sanitizedRowFields
      : tableData[0]
      ? [Object.keys(tableData[0])[0]]
      : ['categoria'];

  const effectiveColFields =
    sanitizedColFields.length > 0
      ? sanitizedColFields
      : tableData[0]
      ? [Object.keys(tableData[0])[1] || Object.keys(tableData[0])[0]]
      : ['ciudad'];

  // 1. Build Column hierarchy
  const {
    headerRows,
    visibleLeafCols,
    allColGroupIds,
    colGroupsByLevel
  } = buildColHierarchy(tableData, effectiveColFields, collapsedCols, maxColLeafs);

  // 2. Build Row hierarchy
  const {
    visibleRows,
    allRowGroupIds,
    rowGroupsByLevel,
    colTotals,
    grandTotal,
    maxCellVal
  } = buildRowHierarchy(
    tableData,
    effectiveRowFields,
    effectiveColFields,
    visibleLeafCols,
    valueField,
    aggregation,
    collapsedRows,
    showSubtotals,
    maxRowLeafs
  );

  return {
    rowFields: effectiveRowFields,
    colFields: effectiveColFields,
    valueField,
    aggregation,
    visibleRows,
    headerRows,
    visibleLeafCols,
    colTotals,
    grandTotal,
    maxCellVal,
    maxRowLevels: effectiveRowFields.length,
    maxColLevels: effectiveColFields.length,
    allRowGroupIds,
    allColGroupIds,
    rowGroupsByLevel,
    colGroupsByLevel
  };
}
