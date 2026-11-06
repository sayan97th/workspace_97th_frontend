import { describe, expect, test } from "vitest";
import type { BoardImportMapping, BoardImportSourceColumn } from "@/types/board-import";
import { mappingNeedsReview, unmatchedPeople } from "@/components/board/import/ImportMapColumnRow";

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
