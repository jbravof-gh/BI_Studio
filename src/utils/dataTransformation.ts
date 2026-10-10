import { 
  DataTransformationConfig, 
  CalculatedFormulaField, 
  TableAggregationDef, 
  TransformationAggregationFn 
} from '../types';

export interface FormulaPreset {
  id: string;
  name: string;
  category: 'impuestos' | 'operaciones' | 'logica' | 'texto';
  description: string;
  template: string; // e.g. "[{field}] * 1.21"
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    id: 'iva_21',
    name: 'Añadir IVA (21%)',
    category: 'impuestos',
    description: 'Multiplica por 1.21 para incluir el 21% de IVA',
    template: '[{field}] * 1.21'
  },
  {
    id: 'iva_10',
    name: 'IVA Reducido (10%)',
    category: 'impuestos',
    description: 'Multiplica por 1.10 para incluir el 10% de IVA',
    template: '[{field}] * 1.10'
  },
  {
    id: 'descuento_10',
    name: 'Descuento 10%',
    category: 'operaciones',
    description: 'Aplica un descuento directo del 10% (x 0.90)',
    template: '[{field}] * 0.90'
  },
  {
    id: 'multiply_fields',
    name: 'Multiplicar dos campos (P x Q)',
    category: 'operaciones',
    description: 'Multiplica precio por cantidad u otra variable',
    template: '[{field}] * [{field2}]'
  },
  {
    id: 'margin_diff',
    name: 'Margen / Diferencia (A - B)',
    category: 'operaciones',
    description: 'Resta dos importes (ej. Precio - Coste)',
    template: '[{field}] - [{field2}]'
  },
  {
    id: 'ratio_pct',
    name: 'Porcentaje / Ratio (A / B x 100)',
    category: 'operaciones',
    description: 'Calcula el porcentaje relativo entre dos campos',
    template: 'ROUND(([{field}] / [{field2}]) * 100, 2)'
  },
  {
    id: 'round_2',
    name: 'Redondear a 2 decimales',
    category: 'operaciones',
    description: 'Redondea el número con 2 decimales',
    template: 'ROUND([{field}], 2)'
  },
  {
    id: 'if_condition',
    name: 'Condición IF (Si > X, A, B)',
    category: 'logica',
    description: 'Devuelve un valor según una condición',
    template: 'IF([{field}] > 100, [{field}] * 0.95, [{field}])'
  },
  {
    id: 'upper_text',
    name: 'Texto en Mayúsculas',
    category: 'texto',
    description: 'Convierte el texto a mayúsculas',
    template: 'UPPER([{field}])'
  }
];

/**
 * Token types for the safe formula parser
 */
type TokenType = 'NUMBER' | 'STRING' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
}

/**
 * Safe lexer for formula strings
 */
function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = formula.length;

  while (i < len) {
    const char = formula[i];

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Bracketed field identifier: [Field Name]
    if (char === '[') {
      const closeIdx = formula.indexOf(']', i);
      if (closeIdx !== -1) {
        const fieldName = formula.slice(i + 1, closeIdx).trim();
        tokens.push({ type: 'IDENTIFIER', value: fieldName });
        i = closeIdx + 1;
        continue;
      }
    }

    // Double curly field identifier: {{Field Name}}
    if (char === '{' && formula[i + 1] === '{') {
      const closeIdx = formula.indexOf('}}', i);
      if (closeIdx !== -1) {
        const fieldName = formula.slice(i + 2, closeIdx).trim();
        tokens.push({ type: 'IDENTIFIER', value: fieldName });
        i = closeIdx + 2;
        continue;
      }
    }

    // Single or double quoted string literal: 'hello' or "hello"
    if (char === "'" || char === '"') {
      const quote = char;
      let str = '';
      i++;
      while (i < len && formula[i] !== quote) {
        if (formula[i] === '\\' && i + 1 < len) {
          str += formula[i + 1];
          i += 2;
        } else {
          str += formula[i];
          i++;
        }
      }
      i++; // Skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Numbers (integer or decimal)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(formula[i + 1] || ''))) {
      let numStr = '';
      while (i < len && /[0-9.]/.test(formula[i])) {
        numStr += formula[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // Multi-char operators: ==, !=, <=, >=, &&, ||
    const twoChars = formula.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChars)) {
      tokens.push({ type: 'OPERATOR', value: twoChars });
      i += 2;
      continue;
    }

    // Single-char operators
    if (['+', '-', '*', '/', '%', '>', '<', '=', '!'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char === '=' ? '==' : char });
      i++;
      continue;
    }

    // Parentheses and Comma
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Identifiers or function names (alphanumeric + underscore)
    if (/[a-zA-Z_áéíóúÁÉÍÓÚñÑ]/.test(char)) {
      let idStr = '';
      while (i < len && /[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]/.test(formula[i])) {
        idStr += formula[i];
        i++;
      }
      tokens.push({ type: 'IDENTIFIER', value: idStr });
      continue;
    }

    // Unrecognized character
    i++;
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

/**
 * Safe Recursive-Descent Expression Parser & Evaluator
 */
class FormulaEvaluator {
  private tokens: Token[];
  private current: number = 0;
  private record: Record<string, any>;

  constructor(tokens: Token[], record: Record<string, any>) {
    this.tokens = tokens;
    this.record = record;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '' };
  }

  private consume(expectedType?: TokenType): Token {
    const token = this.peek();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Se esperaba ${expectedType} pero se encontró ${token.type} (${token.value})`);
    }
    this.current++;
    return token;
  }

  private match(...operators: string[]): boolean {
    const token = this.peek();
    if (token.type === 'OPERATOR' && operators.includes(String(token.value))) {
      this.current++;
      return true;
    }
    return false;
  }

  public parse(): any {
    if (this.peek().type === 'EOF') return 0;
    const result = this.parseLogicalOr();
    return result;
  }

  // Logical OR: expr || expr
  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();
    while (this.match('||') || (this.peek().type === 'IDENTIFIER' && String(this.peek().value).toUpperCase() === 'OR')) {
      if (this.peek().type === 'IDENTIFIER') this.current++;
      const right = this.parseLogicalAnd();
      left = left || right;
    }
    return left;
  }

  // Logical AND: expr && expr
  private parseLogicalAnd(): any {
    let left = this.parseEquality();
    while (this.match('&&') || (this.peek().type === 'IDENTIFIER' && String(this.peek().value).toUpperCase() === 'AND')) {
      if (this.peek().type === 'IDENTIFIER') this.current++;
      const right = this.parseEquality();
      left = left && right;
    }
    return left;
  }

  // Equality: ==, !=
  private parseEquality(): any {
    let left = this.parseRelational();
    while (this.match('==', '!=')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.parseRelational();
      if (op === '==') left = left == right;
      else if (op === '!=') left = left != right;
    }
    return left;
  }

  // Relational: <, <=, >, >=
  private parseRelational(): any {
    let left = this.parseAdditive();
    while (this.match('<', '<=', '>', '>=')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.parseAdditive();
      const numLeft = Number(left);
      const numRight = Number(right);
      if (op === '<') left = numLeft < numRight;
      else if (op === '<=') left = numLeft <= numRight;
      else if (op === '>') left = numLeft > numRight;
      else if (op === '>=') left = numLeft >= numRight;
    }
    return left;
  }

  // Additive: +, -
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (this.match('+', '-')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.parseMultiplicative();
      if (op === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left ?? '') + String(right ?? '');
        } else {
          left = (Number(left) || 0) + (Number(right) || 0);
        }
      } else if (op === '-') {
        left = (Number(left) || 0) - (Number(right) || 0);
      }
    }
    return left;
  }

  // Multiplicative: *, /, %
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (this.match('*', '/', '%')) {
      const op = this.tokens[this.current - 1].value;
      const right = this.parseUnary();
      const numLeft = Number(left) || 0;
      const numRight = Number(right);
      if (op === '*') {
        left = numLeft * (isNaN(numRight) ? 0 : numRight);
      } else if (op === '/') {
        left = numRight === 0 || isNaN(numRight) ? 0 : numLeft / numRight;
      } else if (op === '%') {
        left = numRight === 0 || isNaN(numRight) ? 0 : numLeft % numRight;
      }
    }
    return left;
  }

  // Unary: -expr, +expr, !expr
  private parseUnary(): any {
    if (this.match('-')) {
      return -(Number(this.parseUnary()) || 0);
    }
    if (this.match('+')) {
      return +(Number(this.parseUnary()) || 0);
    }
    if (this.match('!')) {
      return !this.parseUnary();
    }
    return this.parsePrimary();
  }

  // Primary: Number, String, (expr), FunctionCall, Identifier (Field)
  private parsePrimary(): any {
    const token = this.peek();

    // Number literal
    if (token.type === 'NUMBER') {
      this.consume('NUMBER');
      return Number(token.value);
    }

    // String literal
    if (token.type === 'STRING') {
      this.consume('STRING');
      return String(token.value);
    }

    // Parentheses (expr)
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const val = this.parseLogicalOr();
      this.consume('RPAREN');
      return val;
    }

    // Identifiers: Functions or Record Fields
    if (token.type === 'IDENTIFIER') {
      const id = String(token.value);
      this.consume('IDENTIFIER');

      // Check if next is '(', meaning function call
      if (this.peek().type === 'LPAREN') {
        return this.parseFunctionCall(id);
      }

      // Record field resolution
      const resolved = this.resolveFieldValue(id);
      return resolved;
    }

    return 0;
  }

  private parseFunctionCall(fnName: string): any {
    this.consume('LPAREN');
    const args: any[] = [];
    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseLogicalOr());
      while (this.peek().type === 'COMMA') {
        this.consume('COMMA');
        args.push(this.parseLogicalOr());
      }
    }
    this.consume('RPAREN');

    const fn = fnName.toUpperCase();
    switch (fn) {
      case 'ROUND': {
        const val = Number(args[0]) || 0;
        const dec = args[1] !== undefined ? Number(args[1]) || 0 : 2;
        const factor = Math.pow(10, dec);
        return Math.round(val * factor) / factor;
      }
      case 'ABS':
        return Math.abs(Number(args[0]) || 0);
      case 'CEIL':
        return Math.ceil(Number(args[0]) || 0);
      case 'FLOOR':
        return Math.floor(Number(args[0]) || 0);
      case 'MIN':
        return Math.min(...args.map(a => Number(a) || 0));
      case 'MAX':
        return Math.max(...args.map(a => Number(a) || 0));
      case 'UPPER':
        return String(args[0] ?? '').toUpperCase();
      case 'LOWER':
        return String(args[0] ?? '').toLowerCase();
      case 'TRIM':
        return String(args[0] ?? '').trim();
      case 'CONCAT':
        return args.map(a => String(a ?? '')).join('');
      case 'IF':
        return Boolean(args[0]) ? args[1] : (args[2] ?? '');
      case 'COALESCE':
        return args.find(a => a !== undefined && a !== null && a !== '') ?? 0;
      default:
        return args[0] ?? 0;
    }
  }

  private resolveFieldValue(fieldName: string): any {
    if (!this.record) return 0;

    // Exact match
    if (fieldName in this.record) {
      const val = this.record[fieldName];
      return this.castVal(val);
    }

    // Case-insensitive match
    const lower = fieldName.toLowerCase();
    const key = Object.keys(this.record).find(k => k.toLowerCase() === lower);
    if (key !== undefined) {
      const val = this.record[key];
      return this.castVal(val);
    }

    return 0;
  }

  private castVal(val: any): any {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val;
    // Try parse number if string looks like numeric
    const num = Number(val);
    if (!isNaN(num) && String(val).trim() !== '') {
      return num;
    }
    return val;
  }
}

/**
 * Safely evaluates a formula expression against a data record
 */
export function evaluateFormula(formula: string, record: Record<string, any>): any {
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    return 0;
  }

  try {
    const tokens = tokenizeFormula(formula);
    const evaluator = new FormulaEvaluator(tokens, record || {});
    const res = evaluator.parse();
    return res;
  } catch (err) {
    return 0;
  }
}

/**
 * Validates a formula string and runs a test evaluation on a sample record
 */
export function validateFormulaExpression(
  formula: string,
  sampleRecord: Record<string, any> = {}
): { valid: boolean; sampleResult?: any; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: 'Fórmula vacía' };
  }

  try {
    const tokens = tokenizeFormula(formula);
    const evaluator = new FormulaEvaluator(tokens, sampleRecord);
    const sampleResult = evaluator.parse();
    return { valid: true, sampleResult };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Error de sintaxis en la fórmula' };
  }
}

/**
 * Formats a transformed numeric or string value for display
 */
export function formatTransformedValue(
  val: any,
  format?: 'number' | 'currency' | 'percent' | 'string',
  decimals: number = 2
): string {
  if (val === undefined || val === null) return '-';
  if (format === 'string' || typeof val === 'string') {
    return String(val);
  }

  const num = Number(val);
  if (isNaN(num)) return String(val);

  switch (format) {
    case 'currency':
      return `${num.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} €`;
    case 'percent':
      return `${num.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} %`;
    case 'number':
    default:
      return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }
}

/**
 * Computes single aggregation over an array of records
 */
export function calculateAggregationValue(
  records: Record<string, any>[],
  field: string,
  fn: TransformationAggregationFn
): number {
  if (!records || records.length === 0) return 0;
  if (fn === 'count' || field === '*') return records.length;

  const numbers = records
    .map(r => Number(r[field]))
    .filter(n => !isNaN(n) && isFinite(n));

  if (numbers.length === 0) return 0;

  switch (fn) {
    case 'sum':
      return numbers.reduce((acc, curr) => acc + curr, 0);
    case 'avg':
      return numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
    case 'min':
      return Math.min(...numbers);
    case 'max':
      return Math.max(...numbers);
    case 'none':
    default:
      return numbers[0] || 0;
  }
}

export interface TransformationResult {
  transformedRecords: Record<string, any>[];
  summaryRow?: Record<string, any>;
  calculatedColumnNames: string[];
  isAggregated: boolean;
}

/**
 * Master Transformation Pipeline:
 * 1. Computes per-row calculated formula fields
 * 2. If aggregation mode is enabled, groups rows and computes metrics
 * 3. If summary row is enabled, calculates footer totals
 */
export function applyDataTransformation(
  records: Record<string, any>[],
  config?: DataTransformationConfig
): TransformationResult {
  if (!records || records.length === 0) {
    return {
      transformedRecords: [],
      calculatedColumnNames: [],
      isAggregated: false
    };
  }

  if (!config || config.enabled === false) {
    return {
      transformedRecords: records,
      calculatedColumnNames: [],
      isAggregated: false
    };
  }

  const mode = config.mode || 'formulas';
  let processed = [...records];
  const calculatedColumnNames: string[] = [];

  // STEP 1: Compute Calculated Formula Fields (if mode is 'formulas' or 'both')
  if (config.calculatedFields && config.calculatedFields.length > 0) {
    config.calculatedFields.forEach(cf => {
      if (cf.name && cf.formula) {
        calculatedColumnNames.push(cf.name);
      }
    });

    processed = processed.map(row => {
      const newRow = { ...row };
      config.calculatedFields?.forEach(cf => {
        if (cf.name && cf.formula) {
          const rawVal = evaluateFormula(cf.formula, newRow);
          // Store numeric or formatted value
          if (typeof rawVal === 'number' && cf.decimals !== undefined) {
            const factor = Math.pow(10, cf.decimals);
            newRow[cf.name] = Math.round(rawVal * factor) / factor;
          } else {
            newRow[cf.name] = rawVal;
          }
        }
      });
      return newRow;
    });
  }

  // STEP 2: Group By & Aggregation (if mode is 'aggregate' or 'both')
  const shouldAggregate = (mode === 'aggregate' || mode === 'both') && Boolean(config.groupByField);

  if (shouldAggregate) {
    const groupKey = config.groupByField!;
    const groups = new Map<string, Record<string, any>[]>();

    processed.forEach(r => {
      const rawVal = r[groupKey];
      const keyStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '(Sin valor)';
      if (!groups.has(keyStr)) {
        groups.set(keyStr, []);
      }
      groups.get(keyStr)!.push(r);
    });

    const aggregatedRows: Record<string, any>[] = [];

    groups.forEach((groupRecords, gKey) => {
      const aggRow: Record<string, any> = {
        [groupKey]: gKey,
        _isGrouped: true,
        _groupCount: groupRecords.length
      };

      // If user defined specific tableAggregations list
      if (config.tableAggregations && config.tableAggregations.length > 0) {
        config.tableAggregations.forEach(def => {
          const colName = def.label || `${def.aggregation.toUpperCase()}_${def.field}`;
          const val = calculateAggregationValue(groupRecords, def.field, def.aggregation);
          aggRow[colName] = Math.round(val * 100) / 100;
        });
      } else if (config.aggregateMetricField) {
        // Simple default metric
        const fn = config.aggregateFunction || 'sum';
        const colName = `${fn.toUpperCase()}_${config.aggregateMetricField}`;
        const val = calculateAggregationValue(groupRecords, config.aggregateMetricField, fn);
        aggRow['Conteo'] = groupRecords.length;
        aggRow[colName] = Math.round(val * 100) / 100;
      } else {
        aggRow['Total_Registros'] = groupRecords.length;
      }

      aggregatedRows.push(aggRow);
    });

    processed = aggregatedRows;
  }

  // STEP 3: Summary Row (Totals / Averages footer)
  let summaryRow: Record<string, any> | undefined = undefined;
  if (config.showSummaryRow && processed.length > 0) {
    summaryRow = { _isSummary: true };
    const firstColKey = Object.keys(processed[0])[0] || 'Total';
    summaryRow[firstColKey] = `TOTAL (${processed.length})`;

    // Compute for configured columns or automatically for numeric columns
    const keys = Object.keys(processed[0]).filter(k => k !== firstColKey && !k.startsWith('_'));
    keys.forEach(k => {
      const fn = config.summaryRowAggregations?.[k] || 'sum';
      if (fn !== 'none') {
        const val = calculateAggregationValue(processed, k, fn);
        summaryRow![k] = Math.round(val * 100) / 100;
      }
    });
  }

  return {
    transformedRecords: processed,
    summaryRow,
    calculatedColumnNames,
    isAggregated: shouldAggregate
  };
}
