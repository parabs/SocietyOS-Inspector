/**
 * Excel / CSV Ingestion and Parser Utility using SheetJS (xlsx)
 * Supports Single-Sheet and Multi-Sheet Master Workbook Ingestion
 */

import * as XLSX from 'xlsx';
import { DatabaseTableDefinition, DATABASE_TABLES_CATALOG } from '../data/databaseTablesData';

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface IngestionValidationResult {
  validRowsCount: number;
  invalidRowsCount: number;
  warningsCount: number;
  mappedColumns: {
    dbColumn: string;
    excelColumn: string;
    isMatched: boolean;
  }[];
  rowValidationErrors: {
    rowIndex: number;
    column: string;
    message: string;
  }[];
}

export interface SheetMatchResult {
  sheetName: string;
  matchedTable: DatabaseTableDefinition | null;
  matchConfidence: 'Exact' | 'Fuzzy' | 'Unmatched';
  totalRows: number;
  validation: IngestionValidationResult | null;
}

export interface BulkIngestionResult {
  totalSheetsFound: number;
  matchedSheetsCount: number;
  totalRowsIngested: number;
  tablesIngested: {
    tableId: string;
    tableName: string;
    sheetName: string;
    rowsCount: number;
    status: 'Success' | 'Partial' | 'Failed';
  }[];
}

/**
 * Read and parse an Excel (.xlsx/.xls) or CSV file from a browser File object
 */
export async function parseExcelOrCsvFile(file: File): Promise<ParsedSheetData[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const results: ParsedSheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON with headers as keys
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      raw: false,
      defval: '',
    });

    // Extract headers
    let headers: string[] = [];
    if (rawRows.length > 0) {
      headers = Object.keys(rawRows[0]);
    } else {
      // Try to read header range
      const ref = sheet['!ref'];
      if (ref) {
        const range = XLSX.utils.decode_range(ref);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
          if (cell && cell.v) headers.push(String(cell.v).trim());
        }
      }
    }

    results.push({
      sheetName,
      headers,
      rows: rawRows,
      totalRows: rawRows.length,
    });
  }

  return results;
}

/**
 * Validate parsed rows against target Database Table definition
 */
export function validateSheetForTable(
  parsedSheet: ParsedSheetData,
  tableDef: DatabaseTableDefinition
): IngestionValidationResult {
  const mappedColumns = tableDef.columns.map((col) => {
    const colNameClean = col.name.toLowerCase().replace(/_/g, ' ').trim();
    const matchedExcelCol = parsedSheet.headers.find((header) => {
      const hClean = header.toLowerCase().replace(/_/g, ' ').trim();
      return (
        hClean === colNameClean ||
        hClean === col.name.toLowerCase() ||
        hClean.includes(colNameClean) ||
        colNameClean.includes(hClean)
      );
    });

    return {
      dbColumn: col.name,
      excelColumn: matchedExcelCol || '',
      isMatched: !!matchedExcelCol,
    };
  });

  const rowValidationErrors: { rowIndex: number; column: string; message: string }[] = [];
  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let warningsCount = 0;

  parsedSheet.rows.forEach((row, index) => {
    let rowHasError = false;

    tableDef.columns.forEach((col) => {
      const mapping = mappedColumns.find((m) => m.dbColumn === col.name);
      const val = mapping?.excelColumn ? row[mapping.excelColumn] : undefined;

      if (col.required && (val === undefined || val === null || String(val).trim() === '')) {
        rowValidationErrors.push({
          rowIndex: index + 1,
          column: col.name,
          message: `Required field "${col.name}" is missing or empty`,
        });
        rowHasError = true;
      } else if (val !== undefined && val !== null && String(val).trim() !== '') {
        if (col.type === 'number' || col.type === 'currency') {
          const cleaned = String(val).replace(/,/g, '').replace(/₹/g, '').trim();
          if (isNaN(Number(cleaned))) {
            rowValidationErrors.push({
              rowIndex: index + 1,
              column: col.name,
              message: `Expected numeric/currency for "${col.name}", got "${val}"`,
            });
            rowHasError = true;
          }
        }
      }
    });

    if (rowHasError) {
      invalidRowsCount++;
    } else {
      validRowsCount++;
    }
  });

  return {
    validRowsCount,
    invalidRowsCount,
    warningsCount,
    mappedColumns,
    rowValidationErrors,
  };
}

/**
 * Match all sheets from an uploaded multi-sheet Excel workbook against the database catalog
 */
export function matchWorkbookSheets(
  parsedSheets: ParsedSheetData[],
  catalog: DatabaseTableDefinition[]
): SheetMatchResult[] {
  return parsedSheets.map((sheet) => {
    const sNameNorm = sheet.sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Look for exact match or normalized match
    let matchedTable: DatabaseTableDefinition | null = null;
    let confidence: 'Exact' | 'Fuzzy' | 'Unmatched' = 'Unmatched';

    for (const tbl of catalog) {
      const tSheetNorm = tbl.excelSheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tNameNorm = tbl.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (sNameNorm === tSheetNorm) {
        matchedTable = tbl;
        confidence = 'Exact';
        break;
      } else if (sNameNorm.includes(tSheetNorm) || tSheetNorm.includes(sNameNorm) || sNameNorm.includes(tNameNorm)) {
        matchedTable = tbl;
        confidence = 'Fuzzy';
      }
    }

    const validation = matchedTable ? validateSheetForTable(sheet, matchedTable) : null;

    return {
      sheetName: sheet.sheetName,
      matchedTable,
      matchConfidence: confidence,
      totalRows: sheet.totalRows,
      validation,
    };
  });
}

/**
 * Bulk ingest all matched sheets from an uploaded workbook into database tables dictionary
 */
export function executeBulkIngestion(
  sheetMatches: SheetMatchResult[],
  parsedSheets: ParsedSheetData[]
): {
  updatedDatabaseData: Record<string, Record<string, any>[]>;
  summary: BulkIngestionResult;
} {
  const updatedDatabaseData: Record<string, Record<string, any>[]> = {};
  const tablesIngested: BulkIngestionResult['tablesIngested'] = [];
  let totalRowsIngested = 0;

  sheetMatches.forEach((match) => {
    if (!match.matchedTable) return;

    const sheet = parsedSheets.find((s) => s.sheetName === match.sheetName);
    if (!sheet) return;

    const tableDef = match.matchedTable;
    const mapping = match.validation?.mappedColumns || [];

    const committedRows = sheet.rows.map((row) => {
      const dbRow: Record<string, any> = {};
      tableDef.columns.forEach((col) => {
        const colMap = mapping.find((m) => m.dbColumn === col.name);
        if (colMap?.excelColumn && row[colMap.excelColumn] !== undefined) {
          dbRow[col.name] = row[colMap.excelColumn];
        } else {
          dbRow[col.name] = row[col.name] || '';
        }
      });
      return dbRow;
    });

    updatedDatabaseData[tableDef.id] = committedRows;
    totalRowsIngested += committedRows.length;

    tablesIngested.push({
      tableId: tableDef.id,
      tableName: tableDef.name,
      sheetName: match.sheetName,
      rowsCount: committedRows.length,
      status: 'Success',
    });
  });

  return {
    updatedDatabaseData,
    summary: {
      totalSheetsFound: parsedSheets.length,
      matchedSheetsCount: tablesIngested.length,
      totalRowsIngested,
      tablesIngested,
    },
  };
}

/**
 * Generate a complete Master Excel Workbook containing ALL 11 Database Tables as separate sheets!
 */
export function exportMasterWorkbookWithAllSheets(
  catalog: DatabaseTableDefinition[],
  customData?: Record<string, Record<string, any>[]>,
  includeSampleIfEmpty: boolean = false
) {
  const workbook = XLSX.utils.book_new();

  catalog.forEach((tableDef) => {
    let rows = customData?.[tableDef.id];
    if (!rows || rows.length === 0) {
      if (includeSampleIfEmpty) {
        rows = tableDef.sampleRecords;
      } else {
        // Create an empty template row with headers
        const headerRow: Record<string, string> = {};
        tableDef.columns.forEach((col) => {
          headerRow[col.name] = '';
        });
        rows = [headerRow];
      }
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Truncate sheet name to 31 chars (Excel limit)
    const cleanSheetName = tableDef.excelSheetName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const suffix = includeSampleIfEmpty ? 'With_Sample_Data' : 'Clean_Blank_Template';
  XLSX.writeFile(workbook, `Varsha_Nivas_11Sheets_${suffix}_${timestamp}.xlsx`);
}

/**
 * Export table records to an Excel .xlsx download
 */
export function exportTableToExcel(tableDef: DatabaseTableDefinition, records: Record<string, any>[]) {
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, tableDef.excelSheetName.substring(0, 31));
  XLSX.writeFile(workbook, `${tableDef.excelSheetName}_exported_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export table records to CSV download
 */
export function exportTableToCSV(tableDef: DatabaseTableDefinition, records: Record<string, any>[]) {
  const worksheet = XLSX.utils.json_to_sheet(records);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${tableDef.excelSheetName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
