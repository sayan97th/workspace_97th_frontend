import { describe, expect, test } from "vitest";
import {
  cellValueToText,
  convertCellValue,
  fillSeries,
  parseDateText,
  parseTsv,
  textToCellValue,
  toTsv,
  type CellTextContext,
} from "@/components/board/table/cellClipboard";
import type { ColumnDef, ColumnKind } from "@/components/board/table/types";

const column = (id: string, kind: ColumnKind, options?: ColumnDef["options"]): ColumnDef => ({ id, title: id, kind, width: 120, options });

const context: CellTextContext = {
  people: [
    { id: "u1", initials: "AL", name: "Ada Lovelace", color: "#000" },
    { id: "u2", initials: "GH", name: "Grace Hopper", color: "#000" },
    { id: "u3", initials: "OL", name: "Old Account", color: "#000", is_deactivated: true },
  ],
  tag_defs: [
    { id: "t1", label: "Urgent", color: "#f00" },
    { id: "t2", label: "Client", color: "#0f0" },
  ],
  status_defs: [],
  label_defs: [],
};

const status = column("status", "status", [
  { id: "s_work", label: "Working on it", color: "#fdab3d" },
  { id: "s_done", label: "Done", color: "#00c875" },
]);
const other_status = column("stage", "status", [
  { id: "x_done", label: "Done", color: "#00c875" },
  { id: "x_new", label: "New", color: "#c4c4c4" },
]);

describe("TSV", () => {
  test("round trips cells with tabs, line breaks and quotes", () => {
    const rows = [["plain", 'with "quotes"'], ["tab\there", "line\nbreak"]];
    expect(parseTsv(toTsv(rows))).toEqual(rows);
  });

  test("reads what spreadsheets put on the clipboard, including the trailing line break", () => {
    expect(parseTsv("a\tb\r\nc\td\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });

  test("keeps empty cells", () => {
    expect(parseTsv("a\t\tc")).toEqual([["a", "", "c"]]);
  });
});

describe("value to text", () => {
  test("uses labels and names instead of ids", () => {
    expect(cellValueToText("s_done", status, context)).toBe("Done");
    expect(cellValueToText(["u1", "u2"], column("people", "people"), context)).toBe("Ada Lovelace, Grace Hopper");
    expect(cellValueToText(["t2"], column("tags", "tags"), context)).toBe("Client");
    expect(cellValueToText("2026-09-01..2026-09-05", column("tl", "timeline"), context)).toBe("2026-09-01 - 2026-09-05");
    expect(cellValueToText({ start: "2026-09-01", end: "2026-09-01" } as never, column("tl", "timeline"), context)).toBe("2026-09-01");
  });
});

describe("text to value", () => {
  test("matches option labels without caring about case", () => {
    expect(textToCellValue(" done ", status, context)).toBe("s_done");
    expect(textToCellValue("Unknown", status, context)).toBeUndefined();
  });

  test("resolves people by name or initials and skips deactivated accounts", () => {
    expect(textToCellValue("ada lovelace, GH", column("p", "people"), context)).toEqual(["u1", "u2"]);
    expect(textToCellValue("Old Account", column("p", "people"), context)).toBeUndefined();
  });

  test("reads numbers written with currency and thousands separators", () => {
    expect(textToCellValue("$1,250.50", column("n", "number"), context)).toBe("1250.5");
    expect(textToCellValue("abc", column("n", "number"), context)).toBeUndefined();
  });

  test("reads dates in the common spreadsheet forms", () => {
    expect(parseDateText("2026-09-25")).toBe("2026-09-25");
    expect(parseDateText("09/25/2026")).toBe("2026-09-25");
    expect(parseDateText("25/09/2026")).toBe("2026-09-25");
    expect(parseDateText("Sep 25, 2026")).toBe("2026-09-25");
    expect(parseDateText("25 September 2026")).toBe("2026-09-25");
    expect(parseDateText("2026-02-30")).toBeNull();
  });

  test("reads a timeline range and puts it in order", () => {
    expect(textToCellValue("2026-09-10 - 2026-09-01", column("tl", "timeline"), context)).toBe("2026-09-01..2026-09-10");
  });

  test("empty text clears the cell, except checkboxes which become unchecked", () => {
    expect(textToCellValue("", status, context)).toBeNull();
    expect(textToCellValue("", column("c", "checkbox"), context)).toBe(false);
    expect(textToCellValue("yes", column("c", "checkbox"), context)).toBe(true);
  });

  test("never writes computed columns", () => {
    expect(textToCellValue("5", column("f", "formula"), context)).toBeUndefined();
    expect(textToCellValue("5", column("a", "auto_number"), context)).toBeUndefined();
  });
});

describe("moving a value between columns", () => {
  test("keeps the value inside the same column", () => {
    expect(convertCellValue([{ id: "c1", text: "x", is_done: false }], column("cl", "checklist"), column("cl", "checklist"), context)).toEqual([
      { id: "c1", text: "x", is_done: false },
    ]);
  });

  test("maps a status to the option with the same label in another column", () => {
    expect(convertCellValue("s_done", status, other_status, context)).toBe("x_done");
    expect(convertCellValue("s_work", status, other_status, context)).toBeUndefined();
  });

  test("keeps same kind values that do not depend on the column", () => {
    expect(convertCellValue("2026-01-01", column("d1", "date"), column("d2", "date"), context)).toBe("2026-01-01");
  });
});

describe("fill series", () => {
  test("continues a number series", () => {
    expect(fillSeries(["1", "3"], column("n", "number"), 3)).toEqual(["5", "7", "9"]);
  });

  test("continues a date series", () => {
    expect(fillSeries(["2026-09-28", "2026-10-05"], column("d", "date"), 2)).toEqual(["2026-10-12", "2026-10-19"]);
  });

  test("repeats a single value", () => {
    expect(fillSeries(["s_done"], status, 3)).toEqual(["s_done", "s_done", "s_done"]);
  });

  test("repeats a pattern that is not a steady series", () => {
    expect(fillSeries(["1", "5", "6"], column("n", "number"), 4)).toEqual(["1", "5", "6", "1"]);
  });
});
