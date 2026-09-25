import { format } from "date-fns";
import type { BoardToolbarApi } from "./types";

export type BoardExportFormat = "xlsx" | "csv";

type ExportTable = { headings: string[]; rows: string[][] };

/** Spreadsheet programs run a cell starting with one of these as a formula, so such text is prefixed with a quote (CSV injection). */
const FORMULA_TRIGGER_PATTERN = /^[=+\-@\t\r]/;

const toSafeText = (text: string) => (FORMULA_TRIGGER_PATTERN.test(text) ? `'${text}` : text);

/**
 * Exactly what the board shows: the rows left by the current filters, in the
 * current sort and grouping order, and the columns that are not hidden. Each
 * row starts with its group (table) name, since grouping is lost in a flat file.
 */
export function buildExportTable<TRow>(toolbar: BoardToolbarApi<TRow>): ExportTable {
  // Columns without a label (the row chat icon) carry no exportable data.
  const columns = toolbar.visible_columns.filter((column) => column.label.trim() !== "");
  const getText = toolbar.getExportText ?? toolbar.getColumnText;
  return {
    headings: ["Group", ...columns.map((column) => column.label)],
    rows: toolbar.groups.flatMap((group) =>
      group.rows.map((row) => [group.name, ...columns.map((column) => toSafeText(getText(row, column.id) ?? ""))])
    ),
  };
}

const escapeCsvCell = (text: string) => (/[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

const toCsv = ({ headings, rows }: ExportTable) =>
  // The byte order mark makes Excel read the file as UTF-8, so accents survive.
  "﻿" + [headings, ...rows].map((line) => line.map(escapeCsvCell).join(",")).join("\r\n");

async function toXlsx({ headings, rows }: ExportTable, sheet_name: string): Promise<Blob> {
  // Loaded on demand: the library is only needed the moment someone exports.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  // Excel limits sheet names to 31 characters and forbids a few symbols.
  const worksheet = workbook.addWorksheet(sheet_name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Board");
  worksheet.addRow(headings).font = { bold: true };
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.columns.forEach((column, index) => {
    const longest = Math.max(headings[index]?.length ?? 0, ...rows.slice(0, 200).map((row) => row[index]?.length ?? 0));
    column.width = Math.min(Math.max(longest + 2, 10), 60);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const downloadBlob = (blob: Blob, file_name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toFileSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "board";

/** Downloads the visible rows and columns as an Excel workbook or a CSV file named after the board and today's date. */
export async function exportVisibleRows<TRow>(toolbar: BoardToolbarApi<TRow>, board_name: string, export_format: BoardExportFormat) {
  const table = buildExportTable(toolbar);
  const file_name = `${toFileSlug(board_name)}_${format(new Date(), "yyyy-MM-dd")}.${export_format}`;
  const blob =
    export_format === "csv" ? new Blob([toCsv(table)], { type: "text/csv;charset=utf-8" }) : await toXlsx(table, board_name);
  downloadBlob(blob, file_name);
}
