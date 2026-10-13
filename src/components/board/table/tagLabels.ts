import type { TagDef } from "./types";

// A tag's `label` is typed as `string`, but real column data isn't
// type-checked at write time, a malformed import can leave a non-string
// value (a bare number, say) behind. Coercing first keeps one bad tag from
// crashing the picker.
const labelText = (label: TagDef["label"]): string => String(label ?? "").trim();

/** "seo", "#seo" and " #seo " all read as "#seo", the way monday.com shows every tag. */
export const formatTagLabel = (label: TagDef["label"]): string => {
  const text = labelText(label).replace(/^#+/, "");
  return text ? `#${text}` : "";
};

/** Lowercase label without its "#", so "#SEO" and "seo" compare equal. Mirrors the API's `TagCatalog::normalizeLabel`. */
export const tagSearchKey = (label: TagDef["label"]): string => labelText(label).replace(/^#+/, "").toLowerCase();
