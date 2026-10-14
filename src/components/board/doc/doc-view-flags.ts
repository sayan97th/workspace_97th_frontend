/** Per viewer layout flags shared by the Doc page and the board Doc tab, kept in localStorage. */
export const DOC_FULL_WIDTH_STORAGE_KEY = "doc-page:full-width";
export const DOC_OUTLINE_STORAGE_KEY = "doc-page:outline-open";

export const readDocFlag = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

export const writeDocFlag = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Only a per viewer convenience, nothing to do when storage is blocked.
  }
};
