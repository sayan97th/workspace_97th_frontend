/**
 * Typo tolerant name matching shared by the `@` picker's "Did you mean"
 * rows and pasted mentions: an edit distance where swapping two neighbouring
 * letters counts as one edit (`Jhon` is one edit from `John`), and how many
 * edits a word of some length may be off and still count as the same name.
 */

/** Edit distance between two words, a swap of two neighbouring letters counting as one edit. */
export const editDistance = (first: string, second: string): number => {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;
  const rows: number[][] = Array.from({ length: first.length + 1 }, (_, row) =>
    Array.from({ length: second.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0))
  );
  for (let row = 1; row <= first.length; row += 1) {
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + cost);
      if (row > 1 && column > 1 && first[row - 1] === second[column - 2] && first[row - 2] === second[column - 1]) {
        rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
      }
    }
  }
  return rows[first.length][second.length];
};

/** Most edits a typed word may be from a real name and still be offered, more for longer words. */
export const allowedEdits = (length: number): number => (length <= 4 ? 1 : length <= 8 ? 2 : 3);

/**
 * How far a word being typed is from a name word, or null when it is too far
 * to suggest. Measured against the start of the name as well, so a word still
 * being typed (`Carterr` for Carter, `Ernst` for Ernesto) counts. Short words
 * (under 3 letters) only count when the name starts with them.
 */
export const wordDistance = (typed: string, name_word: string): number | null => {
  if (!typed) return null;
  if (name_word.startsWith(typed)) return 0;
  if (typed.length < 3) return null;
  const allowed = allowedEdits(typed.length);
  const distance = Math.min(editDistance(typed, name_word), editDistance(typed, name_word.slice(0, typed.length)));
  return distance <= allowed ? distance : null;
};
