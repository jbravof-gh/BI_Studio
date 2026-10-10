import { QueryParamDefinition, SavedQueryDefinition, TableInfo } from '../types';

export interface QueryExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  durationMs: number;
  error?: string;
  executedSql: string;
  sourceTableName?: string;
}

export interface StructuredQueryCondition {
  field: string;
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN';
  value: string; // Fixed value or ":paramName"
}

export interface StructuredQuery {
  sourceTable: string;
  selectedColumns: string[]; // ['*'] or specific fields
  joinTable?: string;
  joinSourceField?: string;
  joinTargetField?: string;
  joinType?: 'left' | 'inner';
  whereConditions: StructuredQueryCondition[];
  whereLogic?: 'AND' | 'OR';
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Extracts all parameter names referenced as :paramName, @paramName, or {{paramName}}
 */
export function extractParametersFromSql(sql: string): string[] {
  if (!sql) return [];
  const regex = /(?::|@|{{)([a-zA-Z_][a-zA-Z0-9_]*)(?:}})?/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sql)) !== null) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }

  return Array.from(matches);
}

/**
 * Convert parameter value to proper typed JS value
 */
export function castParamValue(rawVal: any, type?: 'string' | 'number' | 'boolean' | 'date'): any {
  if (rawVal === undefined || rawVal === null) return '';
  if (type === 'number') {
    const num = Number(rawVal);
    return isNaN(num) ? 0 : num;
  }
  if (type === 'boolean') {
    if (typeof rawVal === 'boolean') return rawVal;
    const str = String(rawVal).toLowerCase().trim();
    return str === 'true' || str === '1' || str === 'si' || str === 'yes';
  }
  if (type === 'date') {
    return String(rawVal);
  }
  return String(rawVal);
}

/**
 * Builds SQL string from structured query object
 */
export function buildSqlFromStructured(query: StructuredQuery): string {
  if (!query.sourceTable) return 'SELECT * FROM tabla';

  const cols = query.selectedColumns.length > 0 ? query.selectedColumns.join(', ') : '*';
  let sql = `SELECT ${cols}\nFROM ${query.sourceTable}`;

  if (query.joinTable && query.joinSourceField && query.joinTargetField) {
    const joinType = (query.joinType || 'left').toUpperCase();
    sql += `\n${joinType} JOIN ${query.joinTable} ON ${query.sourceTable}.${query.joinSourceField} = ${query.joinTable}.${query.joinTargetField}`;
  }

  if (query.whereConditions && query.whereConditions.length > 0) {
    const logic = query.whereLogic || 'AND';
    const condStrs = query.whereConditions
      .filter(c => c.field && c.value !== undefined && c.value !== '')
      .map(c => {
        const val = c.value.trim();
        // If it starts with : or @ or {{, it's a parameter, don't quote
        if (/^(:|@|{{)/.test(val)) {
          return `${c.field} ${c.operator} ${val}`;
        }
        // If number
        if (!isNaN(Number(val)) && c.operator !== 'LIKE') {
          return `${c.field} ${c.operator} ${val}`;
        }
        // If LIKE or string
        return `${c.field} ${c.operator} '${val.replace(/'/g, "''")}'`;
      });

    if (condStrs.length > 0) {
      sql += `\nWHERE ${condStrs.join(`\n  ${logic} `)}`;
    }
  }

  if (query.orderByField) {
    const dir = (query.orderDirection || 'asc').toUpperCase();
    sql += `\nORDER BY ${query.orderByField} ${dir}`;
  }

  if (query.limit && query.limit > 0) {
    sql += `\nLIMIT ${query.limit}`;
  }

  return sql;
}

/**
 * Simple attempt to parse standard SQL into StructuredQuery for the visual builder
 */
export function parseSqlToStructured(sql: string, knownTables: string[] = []): StructuredQuery | null {
  if (!sql) return null;
  try {
    const cleanSql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();

    // Match SELECT ... FROM table ...
    const selectMatch = cleanSql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+AS\s+([a-zA-Z0-9_]+)|\s+([a-zA-Z0-9_]+))?/i);
    if (!selectMatch) return null;

    const rawCols = selectMatch[1].trim();
    const sourceTable = selectMatch[2].trim();

    const selectedColumns = rawCols === '*'
      ? ['*']
      : rawCols.split(',').map(c => c.trim().split(/\s+AS\s+/i)[0].trim());

    // Match JOIN ... ON ...
    let joinTable: string | undefined;
    let joinSourceField: string | undefined;
    let joinTargetField: string | undefined;
    let joinType: 'left' | 'inner' | undefined;

    const joinMatch = cleanSql.match(/(LEFT\s+JOIN|INNER\s+JOIN|JOIN)\s+([a-zA-Z0-9_]+)\s+(?:AS\s+[a-zA-Z0-9_]+\s+)?ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/i);
    if (joinMatch) {
      joinType = joinMatch[1].toUpperCase().includes('INNER') ? 'inner' : 'left';
      joinTable = joinMatch[2];
      const sideA = joinMatch[3].split('.').pop() || '';
      const sideB = joinMatch[4].split('.').pop() || '';
      joinSourceField = sideA;
      joinTargetField = sideB;
    }

    // Match WHERE ...
    const whereConditions: StructuredQueryCondition[] = [];
    const whereMatch = cleanSql.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
    let whereLogic: 'AND' | 'OR' = 'AND';

    if (whereMatch) {
      const rawWhere = whereMatch[1].trim();
      whereLogic = /\bOR\b/i.test(rawWhere) ? 'OR' : 'AND';
      const condSplit = rawWhere.split(new RegExp(`\\b${whereLogic}\\b`, 'i'));

      for (const cond of condSplit) {
        const opMatch = cond.trim().match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE|IN)\s*(.+)/i);
        if (opMatch) {
          const field = opMatch[1].split('.').pop() || opMatch[1];
          let op = opMatch[2].toUpperCase() as any;
          if (op === '<>') op = '!=';
          let val = opMatch[3].trim().replace(/^'|'$/g, '');
          whereConditions.push({ field, operator: op, value: val });
        }
      }
    }

    // Match ORDER BY ...
    let orderByField: string | undefined;
    let orderDirection: 'asc' | 'desc' = 'asc';
    const orderMatch = cleanSql.match(/ORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      orderByField = orderMatch[1].split('.').pop() || orderMatch[1];
      if (orderMatch[2] && orderMatch[2].toUpperCase() === 'DESC') {
        orderDirection = 'desc';
      }
    }

    // Match LIMIT ...
    let limit: number | undefined;
    const limitMatch = cleanSql.match(/LIMIT\s+([0-9]+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    }

    return {
      sourceTable,
      selectedColumns,
      joinTable,
      joinSourceField,
      joinTargetField,
      joinType,
      whereConditions,
      whereLogic,
      orderByField,
      orderDirection,
      limit
    };
  } catch (err) {
    return null;
  }
}

/**
 * Execute query against in-memory records
 */
export function executeQuery(
  rawSql: string,
  params: QueryParamDefinition[] = [],
  dbRecords: Record<string, Record<string, any>[]> = {}
): QueryExecutionResult {
  const startTime = performance.now();

  if (!rawSql || !rawSql.trim()) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      durationMs: 0,
      error: 'La consulta SQL está vacía.',
      executedSql: ''
    };
  }

  try {
    // 1. Parameter resolution map
    const paramMap: Record<string, any> = {};
    for (const p of params) {
      const val = p.currentValue !== undefined && p.currentValue !== '' ? p.currentValue : p.defaultValue;
      paramMap[p.name] = castParamValue(val, p.type);
    }

    // 2. Clean comments and whitespace
    let sql = rawSql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();

    // 3. Interpolate parameters into SQL
    let executedSql = sql;
    for (const [paramName, paramVal] of Object.entries(paramMap)) {
      const regCol = new RegExp(`(?::|@|{{)${paramName}(?:}})?\\b`, 'g');
      let repVal = typeof paramVal === 'string' ? `'${paramVal.replace(/'/g, "''")}'` : String(paramVal);
      if (typeof paramVal === 'boolean') repVal = paramVal ? '1' : '0';
      executedSql = executedSql.replace(regCol, repVal);
    }

    // 4. Parse FROM table
    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    if (!fromMatch) {
      throw new Error('Cláusula FROM no encontrada. Especifica la tabla origen (ej. FROM ventas).');
    }

    const sourceTableName = fromMatch[1];
    const sourceTableAlias = fromMatch[2] || sourceTableName;

    // Get source records
    let baseRecords = dbRecords[sourceTableName];
    if (!baseRecords) {
      // Look up case-insensitively
      const foundKey = Object.keys(dbRecords).find(k => k.toLowerCase() === sourceTableName.toLowerCase());
      if (foundKey) {
        baseRecords = dbRecords[foundKey];
      }
    }

    if (!baseRecords) {
      throw new Error(`Tabla "${sourceTableName}" no encontrada en la base de datos actual.`);
    }

    // Clone records to prevent mutation
    let combinedRows: Record<string, any>[] = baseRecords.map(r => ({ ...r }));

    // 5. Parse JOIN if any
    const joinMatch = sql.match(/(LEFT\s+JOIN|INNER\s+JOIN|JOIN)\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/i);
    if (joinMatch) {
      const isInner = joinMatch[1].toUpperCase().includes('INNER');
      const joinTableName = joinMatch[2];
      const joinTableAlias = joinMatch[3] || joinTableName;

      const sideA = joinMatch[4];
      const sideB = joinMatch[5];

      // Determine which field belongs to which table
      const extractCol = (str: string, tbl: string, alias: string) => {
        if (str.includes('.')) {
          const parts = str.split('.');
          if (parts[0] === tbl || parts[0] === alias) return parts[1];
        }
        return str.replace(/^[a-zA-Z0-9_]+\./, '');
      };

      const sourceJoinKey = sideA.startsWith(sourceTableName + '.') || sideA.startsWith(sourceTableAlias + '.')
        ? sideA.split('.')[1]
        : (sideB.startsWith(sourceTableName + '.') || sideB.startsWith(sourceTableAlias + '.') ? sideB.split('.')[1] : sideA);

      const targetJoinKey = sideB.startsWith(joinTableName + '.') || sideB.startsWith(joinTableAlias + '.')
        ? sideB.split('.')[1]
        : (sideA.startsWith(joinTableName + '.') || sideA.startsWith(joinTableAlias + '.') ? sideA.split('.')[1] : sideB);

      let targetRecords = dbRecords[joinTableName];
      if (!targetRecords) {
        const found = Object.keys(dbRecords).find(k => k.toLowerCase() === joinTableName.toLowerCase());
        if (found) targetRecords = dbRecords[found];
      }

      if (targetRecords) {
        const joinedResult: Record<string, any>[] = [];
        for (const baseRow of combinedRows) {
          const baseVal = baseRow[sourceJoinKey];
          const matchedTarget = targetRecords.filter(tr => String(tr[targetJoinKey]) === String(baseVal));

          if (matchedTarget.length > 0) {
            for (const tgt of matchedTarget) {
              const combined: Record<string, any> = { ...baseRow };
              // Merge target fields with prefix if collision
              for (const [k, v] of Object.entries(tgt)) {
                if (k in combined && k !== targetJoinKey) {
                  combined[`${joinTableName}_${k}`] = v;
                } else if (!(k in combined)) {
                  combined[k] = v;
                }
              }
              joinedResult.push(combined);
            }
          } else if (!isInner) {
            // LEFT JOIN keeps baseRow
            joinedResult.push({ ...baseRow });
          }
        }
        combinedRows = joinedResult;
      }
    }

    // 6. Parse and Apply WHERE clause
    const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const rawWhere = whereMatch[1].trim();

      // Check if top-level logic is OR
      const isOr = /\bOR\b/i.test(rawWhere) && !/\bAND\b/i.test(rawWhere);
      const conditions = rawWhere.split(new RegExp(`\\b${isOr ? 'OR' : 'AND'}\\b`, 'i')).map(c => c.trim()).filter(Boolean);

      combinedRows = combinedRows.filter(row => {
        const results = conditions.map(cond => evaluateCondition(cond, row, paramMap));
        return isOr ? results.some(Boolean) : results.every(Boolean);
      });
    }

    // 7. Parse and Apply ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([a-zA-Z0-9_.]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      let orderCol = orderMatch[1].trim();
      if (orderCol.includes('.')) orderCol = orderCol.split('.')[1];
      const isDesc = orderMatch[2] ? orderMatch[2].toUpperCase() === 'DESC' : false;

      combinedRows.sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return isDesc ? valB - valA : valA - valB;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return isDesc ? strB.localeCompare(strA) : strA.localeCompare(strB);
      });
    }

    // 8. Parse and Apply LIMIT & OFFSET
    const limitMatch = sql.match(/LIMIT\s+([0-9]+)(?:\s+OFFSET\s+([0-9]+))?/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      const offset = limitMatch[2] ? parseInt(limitMatch[2], 10) : 0;
      combinedRows = combinedRows.slice(offset, offset + limit);
    }

    // 9. Parse and Apply SELECT columns projection
    const selectMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
    let finalColumns: string[] = [];
    let finalRows: Record<string, any>[] = [];

    if (selectMatch) {
      const rawCols = selectMatch[1].trim();
      if (rawCols === '*' || rawCols.includes('*')) {
        // Collect all keys from all returned rows
        const colSet = new Set<string>();
        combinedRows.slice(0, 100).forEach(r => Object.keys(r).forEach(k => colSet.add(k)));
        finalColumns = Array.from(colSet);
        finalRows = combinedRows;
      } else {
        // Specific columns e.g. "id, cliente AS nombre_cliente, total"
        const colDefs = rawCols.split(',').map(c => c.trim()).filter(Boolean);
        const projections = colDefs.map(colDef => {
          const asMatch = colDef.match(/(.+?)\s+AS\s+([a-zA-Z0-9_]+)/i);
          if (asMatch) {
            let sourceField = asMatch[1].trim();
            if (sourceField.includes('.')) sourceField = sourceField.split('.')[1];
            return { source: sourceField, alias: asMatch[2].trim() };
          }
          let sourceField = colDef;
          if (sourceField.includes('.')) sourceField = sourceField.split('.')[1];
          return { source: sourceField, alias: sourceField };
        });

        finalColumns = projections.map(p => p.alias);
        finalRows = combinedRows.map(row => {
          const newRow: Record<string, any> = {};
          for (const proj of projections) {
            newRow[proj.alias] = row[proj.source] !== undefined ? row[proj.source] : (row[proj.alias] ?? null);
          }
          return newRow;
        });
      }
    } else {
      finalRows = combinedRows;
      finalColumns = combinedRows[0] ? Object.keys(combinedRows[0]) : [];
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      columns: finalColumns,
      rows: finalRows,
      rowCount: finalRows.length,
      durationMs,
      executedSql,
      sourceTableName
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      durationMs,
      error: err.message || 'Error desconocido al ejecutar la consulta.',
      executedSql: rawSql
    };
  }
}

/**
 * Helper to evaluate a single WHERE condition against a row with parameter support
 */
function evaluateCondition(cond: string, row: Record<string, any>, params: Record<string, any>): boolean {
  try {
    // Match: field operator targetValue
    const match = cond.match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE|NOT\s+LIKE|IN)\s*(.+)/i);
    if (!match) return true;

    let field = match[1].trim();
    if (field.includes('.')) field = field.split('.')[1];
    let op = match[2].toUpperCase().trim();
    if (op === '<>') op = '!=';
    let targetRaw = match[3].trim();

    // Check if target is a parameter e.g. :minTotal, @categoria, {{id}}
    const paramMatch = targetRaw.match(/^(?::|@|{{)([a-zA-Z0-9_]+)(?:}})?/);
    let targetValue: any;

    if (paramMatch && paramMatch[1] in params) {
      targetValue = params[paramMatch[1]];
    } else if (targetRaw.startsWith("'") && targetRaw.endsWith("'")) {
      targetValue = targetRaw.slice(1, -1);
    } else if (!isNaN(Number(targetRaw))) {
      targetValue = Number(targetRaw);
    } else if (targetRaw.toLowerCase() === 'true') {
      targetValue = true;
    } else if (targetRaw.toLowerCase() === 'false') {
      targetValue = false;
    } else if (targetRaw.toLowerCase() === 'null') {
      targetValue = null;
    } else {
      targetValue = targetRaw;
    }

    const rowVal = row[field];

    switch (op) {
      case '=':
        return String(rowVal).toLowerCase() === String(targetValue).toLowerCase();
      case '!=':
        return String(rowVal).toLowerCase() !== String(targetValue).toLowerCase();
      case '>':
        return Number(rowVal) > Number(targetValue);
      case '>=':
        return Number(rowVal) >= Number(targetValue);
      case '<':
        return Number(rowVal) < Number(targetValue);
      case '<=':
        return Number(rowVal) <= Number(targetValue);
      case 'LIKE': {
        const pattern = String(targetValue).toLowerCase().replace(/%/g, '.*');
        return new RegExp(pattern).test(String(rowVal ?? '').toLowerCase());
      }
      case 'NOT LIKE': {
        const pattern = String(targetValue).toLowerCase().replace(/%/g, '.*');
        return !new RegExp(pattern).test(String(rowVal ?? '').toLowerCase());
      }
      case 'IN': {
        // Parse list inside parentheses e.g. ('Madrid', 'Barcelona')
        const items = targetRaw.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^'|'$/g, '').toLowerCase());
        return items.includes(String(rowVal).toLowerCase());
      }
      default:
        return true;
    }
  } catch {
    return true;
  }
}

/**
 * Generates sample starter queries based on the available tables in the database
 */
export function getSampleQueriesForDatabase(tables: TableInfo[] = []): SavedQueryDefinition[] {
  if (!tables || tables.length === 0) {
    return [
      {
        id: 'sq_default_1',
        name: 'Consulta Ejemplo con Parámetro',
        querySql: 'SELECT * FROM ventas WHERE total >= :minTotal ORDER BY total DESC LIMIT 20',
        description: 'Filtra registros por un importe mínimo parametrizado',
        params: [
          { name: 'minTotal', type: 'number', label: 'Total Mínimo', defaultValue: 50, currentValue: 50 }
        ]
      }
    ];
  }

  const queries: SavedQueryDefinition[] = [];
  const primaryTable = tables[0];
  const numField = primaryTable.fields.find(f => /total|precio|importe|saldo|cantidad|monto|monto_total/i.test(f)) || primaryTable.fields[1] || 'id';
  const strField = primaryTable.fields.find(f => /nombre|cliente|categoria|estado|ciudad|producto/i.test(f)) || primaryTable.fields[0] || 'id';

  // 1. Filter by numeric parameter
  queries.push({
    id: `sq_${primaryTable.name}_filtrada`,
    name: `${primaryTable.name.toUpperCase()} - Filtro por Umbral`,
    querySql: `SELECT * FROM ${primaryTable.name} WHERE ${numField} >= :valorMinimo ORDER BY ${numField} DESC LIMIT 50`,
    description: `Filtra registros de ${primaryTable.name} con ${numField} mayor o igual al parámetro`,
    params: [
      {
        name: 'valorMinimo',
        type: 'number',
        label: `Mínimo de ${numField}`,
        defaultValue: 20,
        currentValue: 20,
        description: `Umbral numérico mínimo para filtrar ${numField}`
      }
    ]
  });

  // 2. Filter by text parameter
  queries.push({
    id: `sq_${primaryTable.name}_buscar`,
    name: `${primaryTable.name.toUpperCase()} - Búsqueda por Texto`,
    querySql: `SELECT * FROM ${primaryTable.name} WHERE ${strField} LIKE :busqueda LIMIT 50`,
    description: `Busca coincidencias parciales en el campo ${strField}`,
    params: [
      {
        name: 'busqueda',
        type: 'string',
        label: `Buscar en ${strField}`,
        defaultValue: '%',
        currentValue: '%',
        description: 'Texto a buscar (usa % para comodines)'
      }
    ]
  });

  // 3. JOIN query if there is a second table
  if (tables.length >= 2) {
    const secondTable = tables[1];
    // Look for common field
    const commonField = primaryTable.fields.find(f => secondTable.fields.includes(f) || secondTable.fields.includes(`${primaryTable.name}_${f}`)) || 'id';
    queries.push({
      id: `sq_join_${primaryTable.name}_${secondTable.name}`,
      name: `Cruce: ${primaryTable.name} + ${secondTable.name}`,
      querySql: `SELECT ${primaryTable.name}.*, ${secondTable.name}.*\nFROM ${primaryTable.name}\nLEFT JOIN ${secondTable.name} ON ${primaryTable.name}.${commonField} = ${secondTable.name}.${commonField}\nLIMIT 50`,
      description: `Cruce relacional entre ${primaryTable.name} y ${secondTable.name}`,
      params: []
    });
  }

  return queries;
}
