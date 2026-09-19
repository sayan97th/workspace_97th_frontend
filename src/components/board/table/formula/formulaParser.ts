/**
 * Tokenizer and recursive-descent parser for the Formula column's expression
 * language (a monday.com/Excel style subset). Pure and dependency free, so the
 * same code drives the cell renderer, the sort/summary helpers, the dialog's
 * syntax highlighting and its live validation.
 *
 * Grammar, lowest to highest precedence:
 *   comparison  =  <>  !=  <  <=  >  >=
 *   concat      &
 *   additive    +  -
 *   term        *  /
 *   power       ^  (right associative)
 *   unary       -  +
 *   primary     number | "text" | {column} | NAME | NAME(args) | (expr)
 */

export type FormulaTokenType = "number" | "string" | "column" | "name" | "operator" | "paren" | "comma" | "space" | "invalid";

export interface FormulaToken {
  type: FormulaTokenType;
  /** The exact source text, including quotes/braces, so joining every token's `text` rebuilds the input. */
  text: string;
  start: number;
  end: number;
}

export type FormulaBinaryOperator = "+" | "-" | "*" | "/" | "^" | "&" | "=" | "<>" | "<" | "<=" | ">" | ">=";

export type FormulaNode =
  | { type: "number"; value: number; start: number; end: number }
  | { type: "string"; value: string; start: number; end: number }
  | { type: "column"; ref: string; start: number; end: number }
  | { type: "constant"; value: boolean; start: number; end: number }
  | { type: "unary"; operator: "-" | "+"; operand: FormulaNode; start: number; end: number }
  | { type: "binary"; operator: FormulaBinaryOperator; left: FormulaNode; right: FormulaNode; start: number; end: number }
  | { type: "call"; name: string; args: FormulaNode[]; start: number; end: number };

/** A syntax problem with the source range to underline in the editor. */
export class FormulaSyntaxError extends Error {
  readonly start: number;
  readonly end: number;

  constructor(message: string, start: number, end: number) {
    super(message);
    this.name = "FormulaSyntaxError";
    this.start = start;
    this.end = Math.max(end, start + 1);
  }
}

const OPERATOR_CHARS = new Set(["+", "-", "*", "/", "^", "&", "=", "<", ">", "!"]);
const COMPARISON_OPERATORS = new Set(["=", "<>", "!=", "<", "<=", ">", ">="]);
const NAME_START = /[A-Za-z_]/;
const NAME_PART = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;

/**
 * Splits `source` into tokens without ever throwing, so the editor can
 * highlight a half-typed formula. Anything unrecognized (or an unterminated
 * string/column reference) becomes an `invalid` token that `parseFormula`
 * later turns into a proper `FormulaSyntaxError`.
 */
export function tokenizeFormula(source: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  const push = (type: FormulaTokenType, start: number, end: number) => {
    tokens.push({ type, text: source.slice(start, end), start, end });
    index = end;
  };

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < source.length && /\s/.test(source[end])) end++;
      push("space", index, end);
    } else if (DIGIT.test(char) || (char === "." && DIGIT.test(source[index + 1] ?? ""))) {
      let end = index;
      while (end < source.length && DIGIT.test(source[end])) end++;
      if (source[end] === ".") {
        end++;
        while (end < source.length && DIGIT.test(source[end])) end++;
      }
      push("number", index, end);
    } else if (char === '"' || char === "'") {
      // A doubled quote inside the literal escapes it, like a spreadsheet ("say ""hi""").
      let end = index + 1;
      let is_closed = false;
      while (end < source.length) {
        if (source[end] === char) {
          if (source[end + 1] === char) {
            end += 2;
            continue;
          }
          is_closed = true;
          end++;
          break;
        }
        end++;
      }
      push(is_closed ? "string" : "invalid", index, end);
    } else if (char === "{") {
      const close = source.indexOf("}", index + 1);
      if (close === -1) push("invalid", index, source.length);
      else push("column", index, close + 1);
    } else if (NAME_START.test(char)) {
      let end = index + 1;
      while (end < source.length && NAME_PART.test(source[end])) end++;
      push("name", index, end);
    } else if (char === "(" || char === ")") {
      push("paren", index, index + 1);
    } else if (char === "," || char === ";") {
      push("comma", index, index + 1);
    } else if (OPERATOR_CHARS.has(char)) {
      const is_two_char = ["<>", "<=", ">=", "!="].includes(source.slice(index, index + 2));
      push("operator", index, index + (is_two_char ? 2 : 1));
    } else {
      push("invalid", index, index + 1);
    }
  }

  return tokens;
}

/** The unquoted, unescaped text of a `string` token. */
function stringTokenValue(token: FormulaToken): string {
  const quote = token.text[0];
  return token.text.slice(1, -1).split(quote + quote).join(quote);
}

class Parser {
  private readonly tokens: FormulaToken[];
  private position = 0;

  constructor(private readonly source: string) {
    this.tokens = tokenizeFormula(source).filter((token) => token.type !== "space");
  }

  parse(): FormulaNode {
    if (this.tokens.length === 0) throw new FormulaSyntaxError("Enter a formula.", 0, 1);
    const node = this.parseComparison();
    const extra = this.peek();
    if (extra) {
      throw new FormulaSyntaxError(
        extra.text === ")" ? "Unexpected closing parenthesis." : `Unexpected "${extra.text}".`,
        extra.start,
        extra.end
      );
    }
    return node;
  }

  private peek(): FormulaToken | undefined {
    return this.tokens[this.position];
  }

  private next(): FormulaToken {
    return this.tokens[this.position++];
  }

  private isOperator(...operators: string[]): boolean {
    const token = this.peek();
    return token?.type === "operator" && operators.includes(token.text);
  }

  private parseComparison(): FormulaNode {
    let left = this.parseConcat();
    while (this.peek()?.type === "operator" && COMPARISON_OPERATORS.has(this.peek()!.text)) {
      const token = this.next();
      const right = this.parseConcat();
      const operator = (token.text === "!=" ? "<>" : token.text) as FormulaBinaryOperator;
      left = { type: "binary", operator, left, right, start: left.start, end: right.end };
    }
    return left;
  }

  private parseConcat(): FormulaNode {
    let left = this.parseAdditive();
    while (this.isOperator("&")) {
      this.next();
      const right = this.parseAdditive();
      left = { type: "binary", operator: "&", left, right, start: left.start, end: right.end };
    }
    return left;
  }

  private parseAdditive(): FormulaNode {
    let left = this.parseTerm();
    while (this.isOperator("+", "-")) {
      const operator = this.next().text as "+" | "-";
      const right = this.parseTerm();
      left = { type: "binary", operator, left, right, start: left.start, end: right.end };
    }
    return left;
  }

  private parseTerm(): FormulaNode {
    let left = this.parseUnary();
    while (this.isOperator("*", "/")) {
      const operator = this.next().text as "*" | "/";
      const right = this.parseUnary();
      left = { type: "binary", operator, left, right, start: left.start, end: right.end };
    }
    return left;
  }

  // Unary minus binds looser than `^`, so `-2^2` is -4 like in maths.
  private parseUnary(): FormulaNode {
    if (this.isOperator("-", "+")) {
      const token = this.next();
      const operand = this.parseUnary();
      return { type: "unary", operator: token.text as "-" | "+", operand, start: token.start, end: operand.end };
    }
    return this.parsePower();
  }

  private parsePower(): FormulaNode {
    const base = this.parsePrimary();
    if (this.isOperator("^")) {
      this.next();
      const exponent = this.parseUnary();
      return { type: "binary", operator: "^", left: base, right: exponent, start: base.start, end: exponent.end };
    }
    return base;
  }

  private parsePrimary(): FormulaNode {
    const token = this.next();
    if (!token) {
      const end = this.source.length;
      throw new FormulaSyntaxError("The formula ends unexpectedly.", Math.max(end - 1, 0), end);
    }

    switch (token.type) {
      case "number":
        return { type: "number", value: Number(token.text), start: token.start, end: token.end };
      case "string":
        return { type: "string", value: stringTokenValue(token), start: token.start, end: token.end };
      case "column": {
        const ref = token.text.slice(1, -1).trim();
        if (!ref) throw new FormulaSyntaxError("Name a column between the braces.", token.start, token.end);
        return { type: "column", ref, start: token.start, end: token.end };
      }
      case "name":
        return this.parseNameOrCall(token);
      case "paren": {
        if (token.text === ")") throw new FormulaSyntaxError("Unexpected closing parenthesis.", token.start, token.end);
        const inner = this.parseComparison();
        this.expectClosingParen(token);
        return inner;
      }
      case "invalid":
        throw new FormulaSyntaxError(
          token.text.startsWith('"') || token.text.startsWith("'")
            ? "This text is missing its closing quote."
            : token.text.startsWith("{")
              ? "This column reference is missing its closing brace."
              : `Unexpected character "${token.text}".`,
          token.start,
          token.end
        );
      default:
        throw new FormulaSyntaxError(`Unexpected "${token.text}".`, token.start, token.end);
    }
  }

  private parseNameOrCall(name_token: FormulaToken): FormulaNode {
    const upper = name_token.text.toUpperCase();
    const open = this.peek();

    if (open?.type === "paren" && open.text === "(") {
      this.next();
      const args: FormulaNode[] = [];
      const after_open = this.peek();

      if (after_open?.type === "paren" && after_open.text === ")") {
        const close = this.next();
        return { type: "call", name: upper, args, start: name_token.start, end: close.end };
      }

      for (;;) {
        args.push(this.parseComparison());
        const separator = this.peek();
        if (separator?.type === "comma") {
          this.next();
          continue;
        }
        break;
      }
      const close = this.expectClosingParen(open);
      return { type: "call", name: upper, args, start: name_token.start, end: close.end };
    }

    if (upper === "TRUE" || upper === "FALSE") {
      return { type: "constant", value: upper === "TRUE", start: name_token.start, end: name_token.end };
    }
    throw new FormulaSyntaxError(`"${name_token.text}" is not a function or a value. Wrap column names in braces, like {${name_token.text}}.`, name_token.start, name_token.end);
  }

  private expectClosingParen(open: FormulaToken): FormulaToken {
    const token = this.peek();
    if (token?.type === "paren" && token.text === ")") return this.next();
    throw new FormulaSyntaxError("This parenthesis is never closed.", open.start, open.end);
  }
}

const parse_cache = new Map<string, FormulaNode | FormulaSyntaxError>();
const PARSE_CACHE_LIMIT = 200;

/**
 * Parses `source` into an AST, throwing a `FormulaSyntaxError` on bad input.
 * Results (including failures) are memoized per source string, because the
 * Table view re-evaluates the same expression for every row on every render.
 */
export function parseFormula(source: string): FormulaNode {
  let cached = parse_cache.get(source);
  if (!cached) {
    try {
      cached = new Parser(source).parse();
    } catch (error) {
      if (!(error instanceof FormulaSyntaxError)) throw error;
      cached = error;
    }
    if (parse_cache.size >= PARSE_CACHE_LIMIT) parse_cache.clear();
    parse_cache.set(source, cached);
  }
  if (cached instanceof FormulaSyntaxError) throw cached;
  return cached;
}

/** Walks every node of an AST, parents before children. */
export function walkFormula(node: FormulaNode, visit: (node: FormulaNode) => void): void {
  visit(node);
  if (node.type === "unary") walkFormula(node.operand, visit);
  else if (node.type === "binary") {
    walkFormula(node.left, visit);
    walkFormula(node.right, visit);
  } else if (node.type === "call") node.args.forEach((arg) => walkFormula(arg, visit));
}
