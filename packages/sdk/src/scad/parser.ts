import type { ScadNode, ParseError, ParseResult } from "../shared/types";

/**
 * OpenSCAD Parser - Converts OpenSCAD code to AST
 */

class Tokenizer {
  private input: string;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  // Optimized character classification using lookup tables
  // Eliminates regex overhead for every character check
  private static readonly CHAR_TYPES = new Uint8Array(256);
  private static readonly KEYWORDS = new Set([
    "cube",
    "sphere",
    "cylinder",
    "cone",
    "circle",
    "square",
    "polygon",
    "text",
    "translate",
    "rotate",
    "scale",
    "mirror",
    "multmatrix",
    "color",
    "union",
    "difference",
    "intersection",
    "hull",
    "minkowski",
    "linear_extrude",
    "rotate_extrude",
    "projection",
    "offset",
    "resize",
    "for",
    "let",
    "function",
    "module",
    "if",
    "else",
    "echo",
    "import",
    "include",
    "use",
    // Note: true/false/undef are NOT keywords - they're literals handled in parseValue()
  ]);

  // Initialize character type lookup table (called once)
  static {
    // 0 = unknown, 1 = whitespace, 2 = digit, 3 = alpha, 4 = operator, 5 = punctuation
    for (let i = 0; i < 256; i++) {
      const ch = String.fromCharCode(i);
      if (/\s/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 1; // whitespace
      } else if (/\d/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 2; // digit
      } else if (/[a-zA-Z_]/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 3; // alpha
      } else if (
        ["!", "<", ">", "+", "-", "*", "/", "%", "=", "?", ":"].includes(ch)
      ) {
        Tokenizer.CHAR_TYPES[i] = 4; // operator
      } else if (["[", "]", "(", ")", "{", "}", ",", ";"].includes(ch)) {
        Tokenizer.CHAR_TYPES[i] = 5; // punctuation
      } else {
        Tokenizer.CHAR_TYPES[i] = 0; // unknown
      }
    }
  }

  private isWhitespace(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 1;
  }

  private isDigit(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 2;
  }

  private isAlpha(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 3;
  }

  private isAlphaNumeric(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    if (code >= 256) return false;
    const charType = Tokenizer.CHAR_TYPES[code];
    return charType === 2 || charType === 3; // digit or alpha
  }

  private isOperator(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 4;
  }

  private isPunctuation(ch: string): boolean {
    const code =
      this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 5;
  }

  private peek(offset = 0): string {
    const idx = this.pos + offset;
    return idx < this.input.length ? this.input[idx]! : "";
  }

  private advance(): string {
    const ch = this.input[this.pos]!;
    this.pos++;
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespace(): void {
    while (this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  private skipComment(): void {
    if (this.peek() === "/" && this.peek(1) === "/") {
      // Single-line comment
      while (this.peek() && this.peek() !== "\n") {
        this.advance();
      }
      if (this.peek() === "\n") this.advance();
    } else if (this.peek() === "/" && this.peek(1) === "*") {
      // Multi-line comment
      this.advance(); // /
      this.advance(); // *
      while (!(this.peek() === "*" && this.peek(1) === "/")) {
        if (!this.peek()) break;
        this.advance();
      }
      if (this.peek() === "*") this.advance();
      if (this.peek() === "/") this.advance();
    }
  }

  private readString(quote: string): string {
    this.advance(); // Opening quote
    const chars: string[] = [];

    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance();
        const escaped = this.peek();
        switch (escaped) {
          case "n":
            chars.push("\n");
            break;
          case "t":
            chars.push("\t");
            break;
          case "r":
            chars.push("\r");
            break;
          case "\\":
            chars.push("\\");
            break;
          case '"':
            chars.push('"');
            break;
          case "'":
            chars.push("'");
            break;
          default:
            chars.push(escaped);
        }
        this.advance();
      } else {
        chars.push(this.advance());
      }
    }
    if (this.peek() === quote) this.advance(); // Closing quote

    // Join characters at the end instead of repeated concatenation
    return chars.join("");
  }

  private readNumber(): string {
    const start = this.pos;
    let hasDecimal = false;

    // Skip leading sign
    if (this.peek() === "-" || this.peek() === "+") {
      this.advance();
    }

    // Read digits before decimal
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Handle decimal point
    if (this.peek() === ".") {
      hasDecimal = true;
      this.advance(); // Skip '.'

      // Read digits after decimal
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Handle scientific notation
    if (this.peek() === "e" || this.peek() === "E") {
      this.advance(); // Skip 'e' or 'E'

      // Handle sign
      if (this.peek() === "-" || this.peek() === "+") {
        this.advance();
      }

      // Read exponent digits
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    // Extract substring directly instead of building string
    return this.input.substring(start, this.pos);
  }

  private readIdentifier(): string {
    let result = "";
    while (
      this.isAlphaNumeric(this.peek()) ||
      this.peek() === "_" ||
      this.peek() === "$"
    ) {
      result += this.advance();
    }
    return result;
  }

  public tokenize(): Token[] {
    resetTokenPool(); // Reset pool for fresh parsing
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      // Skip all whitespace and comments (may have multiple consecutive comments)
      let prevPos: number;
      do {
        prevPos = this.pos;
        this.skipWhitespace();
        this.skipComment();
      } while (this.pos !== prevPos);

      if (this.pos >= this.input.length) break;

      const ch = this.peek();
      const line = this.line;
      const column = this.column;

      if (ch === '"' || ch === "'") {
        const str = this.readString(ch);
        const token = getOrCreateToken();
        token.type = "string";
        token.value = str;
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else if (
        this.isDigit(ch) ||
        (ch === "-" && this.isDigit(this.peek(1)))
      ) {
        if (ch === "-") this.advance();
        const num = this.readNumber();
        const token = getOrCreateToken();
        token.type = "number";
        token.value = parseFloat((ch === "-" ? "-" : "") + num);
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else if (this.isAlpha(ch) || ch === "$" || ch === "_") {
        const id = this.readIdentifier();
        const type = this.isKeyword(id) ? id : "identifier";
        const token = getOrCreateToken();
        token.type = type as string;
        token.value = id;
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else {
        // Operators and punctuation
        const twoChar = ch + this.peek(1);
        if (["==", "!=", "<=", ">=", "&&", "||"].includes(twoChar)) {
          this.advance();
          this.advance();
          const token = getOrCreateToken();
          token.type = "operator";
          token.value = twoChar;
          token.line = line;
          token.column = column;
          tokens.push(token);
        } else if (["<", ">", "+", "-", "*", "/", "=", "?", ":"].includes(ch)) {
          this.advance();
          const token = getOrCreateToken();
          token.type = "operator";
          token.value = ch;
          token.line = line;
          token.column = column;
          tokens.push(token);
        } else if (["!", "#", "%"].includes(ch)) {
          this.advance();
          const token = getOrCreateToken();
          token.type = "modifier";
          token.value = ch;
          token.line = line;
          token.column = column;
          tokens.push(token);
        } else {
          const punct = this.advance();
          const token = getOrCreateToken();
          token.type = "punctuation";
          token.value = punct;
          token.line = line;
          token.column = column;
          tokens.push(token);
        }
      }
    }

    const eofToken = getOrCreateToken();
    eofToken.type = "eof";
    eofToken.value = "";
    eofToken.line = this.line;
    eofToken.column = this.column;
    tokens.push(eofToken);

    return tokens;
  }

  private isKeyword(word: string): boolean {
    return Tokenizer.KEYWORDS.has(word);
  }
}

interface Token {
  type: string;
  value: any;
  line: number;
  column: number;
}

// Simple token reuse array for memory efficiency
const tokenReusePool: Token[] = [];
let tokenPoolIndex = 0;

function getOrCreateToken(): Token {
  if (tokenPoolIndex < tokenReusePool.length) {
    const token = tokenReusePool[tokenPoolIndex++]!;
    // Reset properties
    token.type = "";
    token.value = null;
    token.line = 0;
    token.column = 0;
    return token;
  }

  const token: Token = {
    type: "",
    value: null,
    line: 0,
    column: 0,
  };
  tokenReusePool[tokenPoolIndex++] = token;
  return token;
}

function resetTokenPool(): void {
  tokenPoolIndex = 0;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return (
      this.tokens[this.pos] || { type: "eof", value: "", line: 0, column: 0 }
    );
  }

  private peek(offset = 1): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] || { type: "eof", value: "", line: 0, column: 0 };
  }

  private advance(): Token {
    const token = this.current();
    if (this.pos < this.tokens.length) this.pos++;
    return token;
  }

  private expect(type: string): Token {
    const token = this.current();
    // Allow matching by type or by value (for punctuation like '[', ']', '(', ')')
    if (token.type !== type && token.value !== type) {
      this.error(`Expected ${type}, got ${token.type}`);
    }
    return this.advance();
  }

  private error(message: string): void {
    const token = this.current();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      code: "SYNTAX_ERROR",
    });
  }

  public parse(): ScadNode[] {
    const nodes: ScadNode[] = [];

    while (this.current().type !== "eof") {
      const node = this.parseStatement();
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private parseStatement(): ScadNode | null {
    const token = this.current();

    if (token.type === "eof") return null;

    // Skip semicolons
    if (token.value === ";") {
      this.advance();
      return null;
    }

    // Check for modifier at the start of statement
    // Handle * specially since it can be either modifier or operator
    if (
      token.type === "modifier" ||
      (token.type === "operator" && token.value === "*")
    ) {
      // Check if * appears at the beginning of a statement (modifier) vs in an expression (operator)
      // Look at the previous token context - if we're at statement start, treat as modifier
      const prevToken = this.pos > 0 ? this.tokens[this.pos - 1] : null;
      const isAtStatementStart =
        !prevToken ||
        prevToken.value === ";" ||
        prevToken.value === "{" ||
        prevToken.value === "}" ||
        prevToken.value === ")" ||
        prevToken.type === "eof";

      if (isAtStatementStart || token.type === "modifier") {
        // Convert * operator token to modifier if needed
        if (token.type === "operator" && token.value === "*") {
          this.advance(); // Skip the * operator token
          // Create a synthetic modifier token for parsing
          const modifierToken = {
            type: "modifier",
            value: "*",
            line: token.line,
            column: token.column,
          };
          // We'll handle this in parseModifier by checking the next token
          return this.parseModifierWithToken(modifierToken);
        } else {
          return this.parseModifier();
        }
      }
    }

    // Module definition
    if (token.value === "module") {
      return this.parseModuleDef();
    }

    // Function definition
    if (token.value === "function") {
      return this.parseFunctionDef();
    }

    // If statement
    if (token.value === "if") {
      return this.parseIf();
    }

    // Echo statement
    if (token.value === "echo") {
      return this.parseEcho();
    }

    // Assert statement
    if (token.value === "assert") {
      return this.parseAssert();
    }

    // Let statement
    if (token.value === "let") {
      return this.parseLet();
    }

    // Variable assignment (identifier followed by =)
    if (token.type === "identifier" && this.peek().value === "=") {
      return this.parseAssignment();
    }

    // Check for primitive
    if (this.isPrimitive(token.value)) {
      return this.parsePrimitive();
    }

    // Check for transform
    if (this.isTransform(token.value)) {
      return this.parseTransform();
    }

    // Check for boolean operation
    if (this.isBooleanOp(token.value)) {
      return this.parseBooleanOp();
    }

    // Check for projection operations
    if (token.value === "projection") {
      return this.parseProjection();
    }

    // Check for import/include statements
    if (
      token.value === "import" ||
      token.value === "include" ||
      token.value === "use"
    ) {
      return this.parseImport();
    }

    // Check for for loop
    if (token.value === "for") {
      return this.parseForLoop();
    }

    // Check for children - special handling before module call
    if (token.value === "children") {
      return this.parseChildren();
    }

    // Module call (user-defined module)
    if (token.type === "identifier") {
      return this.parseModuleCall();
    }

    // Skip unknown tokens
    this.advance();
    return null;
  }

  private parsePrimitive(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();

    return {
      type: "primitive",
      op: op as any,
      params,
      line,
    };
  }

  private parseTransform(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();

    let children: ScadNode[] = [];
    if (this.current().value === "{") {
      // Block with braces
      this.advance(); // {
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
      // Single statement child (OpenSCAD syntax: translate([1,0,0]) cube(10);)
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }

    return {
      type: "transform",
      op: op as any,
      params,
      children,
      line,
    };
  }

  private parseBooleanOp(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;

    // Parse parameters first (this handles the parentheses)
    const params = this.parseParameters();

    let children: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance(); // {
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().value === "(") {
      this.advance(); // (
      if (this.current().value !== ")") {
        children = this.parseBlock();
      }
      this.expect(")");
    }

    return {
      type: "boolean",
      op: op as any,
      children,
      line,
    };
  }

  private parseForLoop(): ScadNode {
    this.expect("for");
    const line = this.current().line;
    this.expect("(");

    const variable = this.expect("identifier").value;
    this.expect("=");
    const range = this.parseRange();

    this.expect(")");

    let body: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance();
      body = this.parseBlock();
      this.expect("}");
    }

    return {
      type: "for",
      variable,
      range: range as any,
      body,
      line,
    };
  }

  private parseImport(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;

    let filename: string;
    if (this.current().value === "<") {
      // System import: <filename>
      this.advance();
      // Read identifier or path until '>'
      let path = "";
      while (this.current().value !== ">" && this.current().type !== "eof") {
        if (
          this.current().type === "identifier" ||
          this.current().value === "/"
        ) {
          path += this.advance().value;
        } else {
          this.advance(); // Skip other chars like . in file extensions
        }
      }
      filename = path;
      this.expect(">");
    } else {
      // Regular import: "filename"
      filename = this.expect("string").value;
    }

    if (this.current().value === ";") {
      this.advance();
    }

    return {
      type: "import",
      op,
      filename,
      line,
    };
  }

  private parseParameters(): Record<string, any> {
    const params: Record<string, any> = {};

    if (this.current().value !== "(") {
      return params;
    }

    this.advance(); // (

    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (this.current().value !== ")" && this.current().type !== "eof") {
      if (++iterations > MAX_ITERATIONS) {
        break; // Prevent infinite loops
      }

      const startPos = this.pos; // Track position to detect infinite loops

      // Check if this is a named parameter (identifier = value)
      if (this.current().type === "identifier" && this.peek().value === "=") {
        const name = this.advance().value;
        this.advance(); // =
        const value = this.parseExpression();
        params[name] = value;

        if (this.current().value === ",") {
          this.advance();
        }
      } else {
        // Positional parameter - could be any expression
        const value = this.parseExpression();
        params["_positional"] = value;
        if (this.current().value === ",") {
          this.advance();
        }
      }

      // Safety check: ensure we made progress
      if (this.pos === startPos && this.current().value !== ")") {
        // No progress made, advance to prevent infinite loop
        this.advance();
        if (this.current().value !== "," && this.current().value !== ")") {
          break; // Exit if we're stuck
        }
      }
    }

    if (this.current().value === ")") {
      this.advance();
    }

    return params;
  }

  private parseValue(): any {
    const token = this.current();

    // Handle unary minus
    if (token.type === "operator" && token.value === "-") {
      this.advance();
      const next = this.parseValue();
      return typeof next === "number" ? -next : null;
    }

    if (token.type === "number") {
      this.advance();
      return token.value;
    }

    if (token.type === "string") {
      this.advance();
      return token.value;
    }

    if (token.value === "[") {
      return this.parseArray();
    }

    if (token.type === "identifier") {
      const name = this.advance().value;
      // Handle boolean literals
      if (name === "true") return true;
      if (name === "false") return false;
      if (name === "undef") return undefined;
      // Return a variable node for proper evaluation
      return { type: "variable", name };
    }

    return null;
  }

  private parseArray(): any[] | any {
    this.expect("[");

    // Check if this is a list comprehension by looking for 'for' immediately after '['
    if (this.current().value === "for") {
      return this.parseListComprehension(null);
    }

    // Regular array - elements can be full expressions (e.g., [x * 2, y + 1])
    const arr: any[] = [];

    while (this.current().value !== "]" && this.current().type !== "eof") {
      // Use parseExpression to handle expressions like x * 2, not just simple values
      arr.push(this.parseExpression());

      if (this.current().value === ",") {
        this.advance();
      }
    }

    this.expect("]");
    return arr;
  }

  private parseListComprehension(expression: any): any {
    const comprehensions: Array<{
      variable: string;
      range: [number, number] | [number, number, number];
    }> = [];

    // Parse one or more for clauses
    while (true) {
      this.expect("for");
      this.expect("(");

      // Parse variable assignment
      const variable = this.expect("identifier").value;
      this.expect("=");
const range = this.parseRange() as [number, number] | [number, number, number];

      this.expect(")");

      comprehensions.push({ variable, range });

      // Check if there's another for clause (multiple fors)
      if (this.current().value === "for") {
        continue; // Parse next for clause
      } else {
        break; // No more for clauses
      }
    }

    // Parse condition (optional) - comes after all for clauses
    let condition: any;
    if (this.current().value === "if") {
      this.advance();
      this.expect("(");
      condition = this.parseExpression();
      this.expect(")");
    }

    // Parse the expression that comes last
    const expr = this.parseExpression();

    this.expect("]");

    return {
      type: "list_comprehension",
      expression: expr,
      comprehensions,
      condition,
    };
  }

  private parseRange(): any[] {
    const token = this.current();

    // Handle range array syntax: [start:end] or [start:step:end]
    // Range elements can be full expressions (e.g., [-width/2 : spacing : width/2])
    if (token.value === "[") {
      this.advance(); // [

      // Parse expressions separated by : until we hit ]
      // Use parseRangeExpression which stops at : and ]
      const values: any[] = [];

      values.push(this.parseRangeExpression());

      while (this.current().value === ":") {
        this.advance(); // :
        values.push(this.parseRangeExpression());
      }

      this.expect("]");

      // Return array of 2 or 3 elements (start:end or start:step:end)
      return values;
    }

    // Parse individual values (non-bracket syntax): start : step? : end
    const values: any[] = [];
    values.push(this.parseRangeExpression());

    while (this.current().value === ":") {
      this.advance(); // :
      values.push(this.parseRangeExpression());
    }

    return values;
  }

  // Parse an expression that stops at : or ] (for range syntax)
  // This is like parseExpression but without ternary operators (which also use :)
  private parseRangeExpression(): any {
    // Parse everything up to but excluding ternary operators
    return this.parseLogicalOr();
  }

  private parseBlock(): ScadNode[] {
    const nodes: ScadNode[] = [];

    while (
      this.current().value !== "}" &&
      this.current().value !== ")" &&
      this.current().type !== "eof"
    ) {
      const node = this.parseStatement();
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private parseModuleDef(): ScadNode {
    this.expect("module");
    const line = this.current().line;
    const name = this.expect("identifier").value;

    // Parse parameters
    const params: string[] = [];
    if (this.current().value === "(") {
      this.advance(); // (
      while (this.current().value !== ")" && this.current().type !== "eof") {
        params.push(this.expect("identifier").value);
        if (this.current().value === ",") {
          this.advance();
        }
      }
      this.expect(")");
    }

    // Parse body
    let body: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance(); // {
      body = this.parseBlock();
      this.expect("}");
    }

    return {
      type: "module_def",
      name,
      params,
      body,
      line,
    };
  }

  private parseFunctionDef(): ScadNode {
    this.expect("function");
    const line = this.current().line;
    const name = this.expect("identifier").value;

    // Parse parameters
    const params: string[] = [];
    if (this.current().value === "(") {
      this.advance(); // (
      while (this.current().value !== ")" && this.current().type !== "eof") {
        params.push(this.expect("identifier").value);
        if (this.current().value === ",") {
          this.advance();
        }
      }
      this.expect(")");
    }

    // Parse expression (function body = expression)
    this.expect("=");
    const expression = this.parseExpression();
    if (this.current().value === ";") {
      this.advance();
    }

    return {
      type: "function_def",
      name,
      params,
      expression,
      line,
    };
  }

  private parseChildren(): ScadNode {
    this.expect("children");
    const line = this.current().line;

    let args: any[] = [];
    if (this.current().value === "(") {
      this.advance();
      if (this.current().value !== ")") {
        // Simple argument parsing for children() - avoid full expression parsing
        if (
          this.current().type === "identifier" ||
          this.current().type === "number"
        ) {
          args.push(this.advance().value);
        } else {
          // Fallback to simple expression for other cases
          args.push(this.parsePrimary());
        }

        while (this.current().value === ",") {
          this.advance();
          if (
            this.current().type === "identifier" ||
            this.current().type === "number"
          ) {
            args.push(this.advance().value);
          } else {
            args.push(this.parsePrimary());
          }
        }
      }
      this.expect(")");
    }

    return {
      type: "children",
      args,
      line,
    };
  }

  private parseModuleCall(): ScadNode {
    const name = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();

    let children: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance(); // {
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
      // Single statement child
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }

    return {
      type: "module_call",
      name,
      params,
      children,
      line,
    };
  }

  private parseAssignment(): ScadNode {
    const name = this.advance().value;
    const line = this.current().line;
    this.expect("=");
    const value = this.parseExpression();
    if (this.current().value === ";") {
      this.advance();
    }

    return {
      type: "assignment",
      name,
      value,
      line,
    };
  }

  private parseIf(): ScadNode {
    this.expect("if");
    const line = this.current().line;

    this.expect("(");
    const condition = this.parseExpression();
    this.expect(")");

    let thenBody: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance(); // {
      thenBody = this.parseBlock();
      this.expect("}");
    } else {
      const node = this.parseStatement();
      if (node) thenBody = [node];
    }

    let elseBody: ScadNode[] | undefined;
    if (this.current().value === "else") {
      this.advance();
      if (this.current().value === "{") {
        this.advance(); // {
        elseBody = this.parseBlock();
        this.expect("}");
      } else {
        const node = this.parseStatement();
        if (node) elseBody = [node];
      }
    }

    return {
      type: "if",
      condition,
      thenBody,
      elseBody,
      line,
    };
  }

  private parseEcho(): ScadNode {
    this.expect("echo");
    const line = this.current().line;
    this.expect("(");

    const values: any[] = [];
    while (this.current().value !== ")" && this.current().type !== "eof") {
      values.push(this.parseExpression());
      if (this.current().value === ",") {
        this.advance();
      }
    }

    this.expect(")");
    if (this.current().value === ";") {
      this.advance();
    }

    return {
      type: "echo",
      values,
      line,
    };
  }

  private parseAssert(): ScadNode {
    this.expect("assert");
    const line = this.current().line;
    this.expect("(");

    const condition = this.parseExpression();
    let message: any = undefined;

    if (this.current().value === ",") {
      this.advance();
      message = this.parseExpression();
    }

    this.expect(")");
    if (this.current().value === ";") {
      this.advance();
    }

    return {
      type: "assert",
      condition,
      message,
      line,
    };
  }

  private parseExpression(): any {
    return this.parseTernary();
  }

  private parseTernary(): any {
    let expr = this.parseLogicalOr();

    if (this.current().value === "?") {
      this.advance(); // ?
      const thenExpr = this.parseExpression();
      this.expect(":");
      const elseExpr = this.parseExpression();
      return {
        type: "ternary",
        condition: expr,
        thenExpr,
        elseExpr,
      };
    }

    return expr;
  }

  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();

    while (this.current().value === "||") {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = {
        type: "expression",
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseLogicalAnd(): any {
    let left = this.parseComparison();

    while (this.current().value === "&&") {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = {
        type: "expression",
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseComparison(): any {
    let left = this.parseAdditive();

    while (["==", "!=", "<", ">", "<=", ">="].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: "expression",
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseAdditive(): any {
    let left = this.parseMultiplicative();

    while (["+", "-"].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: "expression",
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseMultiplicative(): any {
    let left = this.parseUnary();

    while (["*", "/", "%"].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: "expression",
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseUnary(): any {
    if (this.current().value === "!" || this.current().value === "-") {
      const op = this.advance().value;
      const expr = this.parseUnary();
      return {
        type: "expression",
        operator: op,
        left: expr,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const token = this.current();

    // Parenthesized expression
    if (token.value === "(") {
      this.advance(); // (
      const expr = this.parseExpression();
      this.expect(")");
      return expr;
    }

    // Function call
    if (token.type === "identifier" && this.peek().value === "(") {
      const name = this.advance().value;
      this.advance(); // (

      const args: any[] = [];
      while (this.current().value !== ")" && this.current().type !== "eof") {
        args.push(this.parseExpression());
        if (this.current().value === ",") {
          this.advance();
        }
      }
      this.expect(")");

      return {
        type: "function_call",
        name,
        args,
      };
    }

    // Regular value
    return this.parseValue();
  }

  private isPrimitive(word: string): boolean {
    return [
      "cube",
      "sphere",
      "cylinder",
      "cone",
      "circle",
      "square",
      "polygon",
      "polyhedron",
      "text",
    ].includes(word);
  }

  private isTransform(word: string): boolean {
    return [
      "translate",
      "rotate",
      "scale",
      "mirror",
      "multmatrix",
      "color",
      "linear_extrude",
      "rotate_extrude",
      "projection",
      "offset",
      "resize",
    ].includes(word);
  }

  private parseProjection(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;

    // Parse parameters following exact transform pattern
    this.expect("(");
    const params = this.parseParameters();
    this.expect(")");

    let children: ScadNode[] = [];

    // Handle optional block
    if (this.current().value === "{") {
      this.advance(); // {
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
      // Single statement child (OpenSCAD syntax: projection(...) sphere(10);)
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }

    return {
      type: "transform",
      op: "projection",
      params,
      children,
      line,
    };
  }

  private isBooleanOp(word: string): boolean {
    return [
      "union",
      "difference",
      "intersection",
      "hull",
      "minkowski",
    ].includes(word);
  }

  private parseLet(): ScadNode {
    this.expect("let");
    const line = this.current().line;

    // Parse bindings: let(x=10, y=20) ...
    this.expect("(");
    const bindings: Record<string, any> = {};

    while (this.current().value !== ")" && this.current().type !== "eof") {
      const name = this.expect("identifier").value;
      this.expect("=");
      const value = this.parseExpression();
      bindings[name] = value;

      if (this.current().value === ",") {
        this.advance(); // Skip comma
      }
    }

    this.expect(")");

    // Parse body (block or single statement)
    let body: ScadNode[] = [];
    if (this.current().value === "{") {
      this.advance();
      body = this.parseBlock();
      this.expect("}");
    } else {
      const stmt = this.parseStatement();
      if (stmt) {
        body = [stmt];
      }
    }

    return {
      type: "let",
      bindings,
      body,
      line,
    };
  }

  private parseModifier(): ScadNode {
    const modifierToken = this.advance();
    return this.parseModifierWithToken(modifierToken);
  }

  private parseModifierWithToken(modifierToken: {
    value: string;
    line: number;
    column: number;
  }): ScadNode {
    const modifier = modifierToken.value as "!" | "#" | "%" | "*";
    const line = modifierToken.line;

    // Parse the statement that follows the modifier
    const child = this.parseStatement();

    if (!child) {
      this.error(`Expected statement after modifier '${modifier}'`);
      // Create a fallback node to avoid complete failure
      return {
        type: "modifier",
        modifier,
        child: {
          type: "primitive",
          op: "cube",
          params: { size: 0 },
          line,
        },
        line,
      };
    }

    return {
      type: "modifier",
      modifier,
      child,
      line,
    };
  }

  public getErrors(): ParseError[] {
    return this.errors;
  }
}

/**
 * Parse OpenSCAD code to AST
 */
export function parseOpenSCAD(code: string): ParseResult {
  try {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = parser.getErrors();

    return {
      ast,
      errors,
      success: errors.length === 0,
    };
  } catch (err: any) {
    return {
      ast: null,
      errors: [
        {
          message: err.message,
          line: 0,
          column: 0,
          code: "PARSER_ERROR",
        },
      ],
      success: false,
    };
  }
}
