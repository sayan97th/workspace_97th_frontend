import { describe, expect, test } from "vitest";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import { mappingNeedsReview, unmatchedPeople } from "@/components/board/import/ImportMapColumnRow";
import {
  findDuplicateNewLabel,
  insertCopyMapping,
  mappingRowKey,
  nextCopyLabel,
  toCommitMappings,
} from "@/components/board/import/importWizardUtils";

const makeSource = (overrides: Partial<BoardImportSourceColumn> = {}): BoardImportSourceColumn => ({
  index: 1,
  label: "Column",
  sample_values: [],
  suggested_type: "text",
  detection_reason: "",
  compatible_types: ["text", "long_text"],
  combined_from: [],
  filled_count: 3,
  distinct_count: 3,
  declared_options: [],
  option_preset: null,
  assets: null,
  people_match: null,
  ...overrides,
});

const create = (new_type: BoardImportMapping["new_type"]): BoardImportMapping => ({ source_index: 1, mode: "create", new_type });

describe("import map review", () => {
  test("a column with embedded files needs review outside a Files column", () => {
    const source = makeSource({
      suggested_type: "files",
      compatible_types: ["files"],
      assets: { file_count: 2, image_count: 2, cell_count: 2, total_bytes: 10, previews: [] },
    });

    expect(mappingNeedsReview(create("files"), source, [])).toBe(false);
    expect(mappingNeedsReview(create("text"), source, [])).toBe(true);
  });

  test("names that match no user flag a People destination", () => {
    const source = makeSource({
      compatible_types: ["text", "people", "status"],
      people_match: { matched_count: 1, total_count: 3, unmatched: ["Amanda", "Kennedy"] },
    });

    expect(unmatchedPeople("people", source)).toEqual(["Amanda", "Kennedy"]);
    expect(unmatchedPeople("status", source)).toEqual([]);
    expect(mappingNeedsReview(create("people"), source, [])).toBe(true);
    expect(mappingNeedsReview(create("status"), source, [])).toBe(false);
  });

  test("a skipped column never needs review", () => {
    expect(mappingNeedsReview({ source_index: 1, mode: "skip" }, makeSource({ compatible_types: [] }), [])).toBe(false);
  });
});

describe("import duplicated and removed columns", () => {
  const feedback = makeSource({ index: 4, label: "Feedback Description", suggested_type: "long_text" });
  const notes = makeSource({ index: 5, label: "Notes" });

  test("a copy lands right after the rows of its column with a numbered name", () => {
    const mappings: BoardImportMapping[] = [
      { source_index: 4, mode: "create", new_label: "Feedback Description", new_type: "long_text" },
      { source_index: 5, mode: "create", new_label: "Notes", new_type: "text" },
    ];
    const first = insertCopyMapping(mappings, feedback, ["text", "long_text"], [feedback, notes], []);
    expect(first.mappings.map((mapping) => mapping.new_label)).toEqual(["Feedback Description", "Feedback Description 2", "Notes"]);
    expect(first.mappings[1]).toMatchObject({ source_index: 4, mode: "create", new_type: "long_text", is_copy: true });

    const second = insertCopyMapping(first.mappings, feedback, ["text", "long_text"], [feedback, notes], []);
    expect(second.mappings.map((mapping) => mapping.new_label)).toEqual([
      "Feedback Description",
      "Feedback Description 2",
      "Feedback Description 3",
      "Notes",
    ]);
    expect(new Set(second.mappings.map(mappingRowKey)).size).toBe(4);
  });

  test("copy names skip labels already on the board", () => {
    expect(nextCopyLabel("Notes", ["notes", "Notes 2"])).toBe("Notes 3");
  });

  test("two new columns with the same name are caught, case insensitive", () => {
    const mappings: BoardImportMapping[] = [
      { source_index: 4, mode: "create", new_label: null },
      { source_index: 5, mode: "create", new_label: "feedback description " },
      { source_index: 5, mode: "skip" },
    ];
    expect(findDuplicateNewLabel(mappings, [feedback, notes])).toBe("feedback description");
    expect(findDuplicateNewLabel([mappings[0]], [feedback, notes])).toBeNull();
  });

  test("wizard only fields are never sent to the API", () => {
    const sent = toCommitMappings([{ source_index: 4, mode: "create", new_label: "A", row_key: "copy-4-x", is_copy: true }]);
    expect(sent).toEqual([{ source_index: 4, mode: "create", new_label: "A" }]);
  });
});
