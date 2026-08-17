/**
 * Client-side CSV export — no backend endpoint involved. Used by the board
 * table's selection action bar "Export" action to download the checked rows.
 */

/** Escapes one CSV field: wraps it in quotes, doubling any quote it contains. */
const escapeCsvField = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/** Builds a CSV document from a header row plus data rows and triggers a browser download. */
export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  // A leading BOM keeps Excel from mis-decoding non-ASCII characters (names, etc.) as Latin-1.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
