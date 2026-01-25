// backend/scad-parser.ts
class Tokenizer {
  input;
  pos = 0;
  line = 1;
  column = 1;
  constructor(input) {
    this.input = input;
  }
  static CHAR_TYPES = new Uint8Array(256);
  static KEYWORDS = new Set([
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
    "use"
  ]);
  static {
    for (let i = 0;i < 256; i++) {
      const ch = String.fromCharCode(i);
      if (/\s/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 1;
      } else if (/\d/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 2;
      } else if (/[a-zA-Z_]/.test(ch)) {
        Tokenizer.CHAR_TYPES[i] = 3;
      } else if (["!", "<", ">", "+", "-", "*", "/", "%", "=", "?", ":"].includes(ch)) {
        Tokenizer.CHAR_TYPES[i] = 4;
      } else if (["[", "]", "(", ")", "{", "}", ",", ";"].includes(ch)) {
        Tokenizer.CHAR_TYPES[i] = 5;
      } else {
        Tokenizer.CHAR_TYPES[i] = 0;
      }
    }
  }
  isWhitespace(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 1;
  }
  isDigit(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 2;
  }
  isAlpha(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 3;
  }
  isAlphaNumeric(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    if (code >= 256)
      return false;
    const charType = Tokenizer.CHAR_TYPES[code];
    return charType === 2 || charType === 3;
  }
  isOperator(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 4;
  }
  isPunctuation(ch) {
    const code = this.pos < this.input.length ? this.input.charCodeAt(this.pos) : 0;
    return code < 256 && Tokenizer.CHAR_TYPES[code] === 5;
  }
  peek(offset = 0) {
    const idx = this.pos + offset;
    return idx < this.input.length ? this.input[idx] : "";
  }
  advance() {
    const ch = this.input[this.pos];
    this.pos++;
    if (ch === `
`) {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }
  skipWhitespace() {
    while (this.isWhitespace(this.peek())) {
      this.advance();
    }
  }
  skipComment() {
    if (this.peek() === "/" && this.peek(1) === "/") {
      while (this.peek() && this.peek() !== `
`) {
        this.advance();
      }
      if (this.peek() === `
`)
        this.advance();
    } else if (this.peek() === "/" && this.peek(1) === "*") {
      this.advance();
      this.advance();
      while (!(this.peek() === "*" && this.peek(1) === "/")) {
        if (!this.peek())
          break;
        this.advance();
      }
      if (this.peek() === "*")
        this.advance();
      if (this.peek() === "/")
        this.advance();
    }
  }
  readString(quote) {
    this.advance();
    const chars = [];
    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance();
        const escaped = this.peek();
        switch (escaped) {
          case "n":
            chars.push(`
`);
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
    if (this.peek() === quote)
      this.advance();
    return chars.join("");
  }
  readNumber() {
    const start = this.pos;
    let hasDecimal = false;
    if (this.peek() === "-" || this.peek() === "+") {
      this.advance();
    }
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    if (this.peek() === ".") {
      hasDecimal = true;
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    if (this.peek() === "e" || this.peek() === "E") {
      this.advance();
      if (this.peek() === "-" || this.peek() === "+") {
        this.advance();
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    return this.input.substring(start, this.pos);
  }
  readIdentifier() {
    let result = "";
    while (this.isAlphaNumeric(this.peek()) || this.peek() === "_" || this.peek() === "$") {
      result += this.advance();
    }
    return result;
  }
  tokenize() {
    resetTokenPool();
    const tokens = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      this.skipComment();
      this.skipWhitespace();
      if (this.pos >= this.input.length)
        break;
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
      } else if (this.isDigit(ch) || ch === "-" && this.isDigit(this.peek(1))) {
        if (ch === "-")
          this.advance();
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
        token.type = type;
        token.value = id;
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else {
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
  isKeyword(word) {
    return Tokenizer.KEYWORDS.has(word);
  }
}
var tokenReusePool = [];
var tokenPoolIndex = 0;
function getOrCreateToken() {
  if (tokenPoolIndex < tokenReusePool.length) {
    const token2 = tokenReusePool[tokenPoolIndex++];
    token2.type = "";
    token2.value = null;
    token2.line = 0;
    token2.column = 0;
    return token2;
  }
  const token = {
    type: "",
    value: null,
    line: 0,
    column: 0
  };
  tokenReusePool[tokenPoolIndex++] = token;
  return token;
}
function resetTokenPool() {
  tokenPoolIndex = 0;
}

class Parser {
  tokens;
  pos = 0;
  errors = [];
  constructor(tokens) {
    this.tokens = tokens;
  }
  current() {
    return this.tokens[this.pos] || { type: "eof", value: "", line: 0, column: 0 };
  }
  peek(offset = 1) {
    const idx = this.pos + offset;
    return this.tokens[idx] || { type: "eof", value: "", line: 0, column: 0 };
  }
  advance() {
    const token = this.current();
    if (this.pos < this.tokens.length)
      this.pos++;
    return token;
  }
  expect(type) {
    const token = this.current();
    if (token.type !== type && token.value !== type) {
      this.error(`Expected ${type}, got ${token.type}`);
    }
    return this.advance();
  }
  error(message) {
    const token = this.current();
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      code: "SYNTAX_ERROR"
    });
  }
  parse() {
    const nodes = [];
    while (this.current().type !== "eof") {
      const node = this.parseStatement();
      if (node)
        nodes.push(node);
    }
    return nodes;
  }
  parseStatement() {
    const token = this.current();
    if (token.type === "eof")
      return null;
    if (token.value === ";") {
      this.advance();
      return null;
    }
    if (token.type === "modifier" || token.type === "operator" && token.value === "*") {
      const prevToken = this.pos > 0 ? this.tokens[this.pos - 1] : null;
      const isAtStatementStart = !prevToken || prevToken.value === ";" || prevToken.value === "{" || prevToken.value === "}" || prevToken.value === ")" || prevToken.type === "eof";
      if (isAtStatementStart || token.type === "modifier") {
        if (token.type === "operator" && token.value === "*") {
          this.advance();
          const modifierToken = {
            type: "modifier",
            value: "*",
            line: token.line,
            column: token.column
          };
          return this.parseModifierWithToken(modifierToken);
        } else {
          return this.parseModifier();
        }
      }
    }
    if (token.value === "module") {
      return this.parseModuleDef();
    }
    if (token.value === "function") {
      return this.parseFunctionDef();
    }
    if (token.value === "if") {
      return this.parseIf();
    }
    if (token.value === "echo") {
      return this.parseEcho();
    }
    if (token.value === "assert") {
      return this.parseAssert();
    }
    if (token.value === "let") {
      return this.parseLet();
    }
    if (token.type === "identifier" && this.peek().value === "=") {
      return this.parseAssignment();
    }
    if (this.isPrimitive(token.value)) {
      return this.parsePrimitive();
    }
    if (this.isTransform(token.value)) {
      return this.parseTransform();
    }
    if (this.isBooleanOp(token.value)) {
      return this.parseBooleanOp();
    }
    if (token.value === "projection") {
      return this.parseProjection();
    }
    if (token.value === "import" || token.value === "include" || token.value === "use") {
      return this.parseImport();
    }
    if (token.value === "for") {
      return this.parseForLoop();
    }
    if (token.value === "children") {
      return this.parseChildren();
    }
    if (token.type === "identifier") {
      return this.parseModuleCall();
    }
    this.advance();
    return null;
  }
  parsePrimitive() {
    const op = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();
    return {
      type: "primitive",
      op,
      params,
      line
    };
  }
  parseTransform() {
    const op = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();
    let children = [];
    if (this.current().value === "{") {
      this.advance();
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }
    return {
      type: "transform",
      op,
      params,
      children,
      line
    };
  }
  parseBooleanOp() {
    const op = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();
    let children = [];
    if (this.current().value === "{") {
      this.advance();
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().value === "(") {
      this.advance();
      if (this.current().value !== ")") {
        children = this.parseBlock();
      }
      this.expect(")");
    }
    return {
      type: "boolean",
      op,
      children,
      line
    };
  }
  parseForLoop() {
    this.expect("for");
    const line = this.current().line;
    this.expect("(");
    const variable = this.expect("identifier").value;
    this.expect("=");
    const range = this.parseRange();
    this.expect(")");
    let body = [];
    if (this.current().value === "{") {
      this.advance();
      body = this.parseBlock();
      this.expect("}");
    }
    return {
      type: "for",
      variable,
      range,
      body,
      line
    };
  }
  parseImport() {
    const op = this.advance().value;
    const line = this.current().line;
    let filename;
    if (this.current().value === "<") {
      this.advance();
      let path = "";
      while (this.current().value !== ">" && this.current().type !== "eof") {
        if (this.current().type === "identifier" || this.current().value === "/") {
          path += this.advance().value;
        } else {
          this.advance();
        }
      }
      filename = path;
      this.expect(">");
    } else {
      filename = this.expect("string").value;
    }
    if (this.current().value === ";") {
      this.advance();
    }
    return {
      type: "import",
      op,
      filename,
      line
    };
  }
  parseParameters() {
    const params = {};
    if (this.current().value !== "(") {
      return params;
    }
    this.advance();
    while (this.current().value !== ")" && this.current().type !== "eof") {
      if (this.current().type === "identifier" && this.peek().value === "=") {
        const name = this.advance().value;
        this.advance();
        const value = this.parseExpression();
        params[name] = value;
        if (this.current().value === ",") {
          this.advance();
        }
      } else {
        params["_positional"] = this.parseExpression();
        if (this.current().value === ",") {
          this.advance();
        }
      }
    }
    if (this.current().value === ")") {
      this.advance();
    }
    return params;
  }
  parseValue() {
    const token = this.current();
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
      return this.advance().value;
    }
    return null;
  }
  parseArray() {
    this.expect("[");
    if (this.current().value === "for") {
      return this.parseListComprehension(null);
    }
    const arr = [];
    while (this.current().value !== "]" && this.current().type !== "eof") {
      arr.push(this.parseValue());
      if (this.current().value === ",") {
        this.advance();
      }
    }
    this.expect("]");
    return arr;
  }
  parseListComprehension(expression) {
    const comprehensions = [];
    while (true) {
      this.expect("for");
      this.expect("(");
      const variable = this.expect("identifier").value;
      this.expect("=");
      const range = this.parseRange();
      this.expect(")");
      comprehensions.push({ variable, range });
      if (this.current().value === "for") {
        continue;
      } else {
        break;
      }
    }
    let condition;
    if (this.current().value === "if") {
      this.advance();
      this.expect("(");
      condition = this.parseExpression();
      this.expect(")");
    }
    const expr = this.parseExpression();
    this.expect("]");
    return {
      type: "list_comprehension",
      expression: expr,
      comprehensions,
      condition
    };
  }
  parseRange() {
    const token = this.current();
    if (token.value === "[") {
      this.advance();
      const start2 = this.parseValue();
      this.expect(":");
      let step2;
      let end2;
      if (this.current().type === "number") {
        const next = this.parseValue();
        if (this.current().value === ":") {
          step2 = next;
          this.advance();
          end2 = this.parseValue();
        } else {
          end2 = next;
        }
      } else {
        end2 = this.parseValue();
      }
      this.expect("]");
      return step2 !== undefined ? [start2, step2, end2] : [start2, end2];
    }
    const start = this.parseValue();
    let step;
    let end;
    this.expect(":");
    if (this.current().type === "number") {
      const next = this.parseValue();
      if (this.current().value === ":") {
        step = next;
        this.advance();
        end = this.parseValue();
      } else {
        end = next;
      }
    } else {
      end = this.parseValue();
    }
    return step !== undefined ? [start, step, end] : [start, end];
  }
  parseBlock() {
    const nodes = [];
    while (this.current().value !== "}" && this.current().value !== ")" && this.current().type !== "eof") {
      const node = this.parseStatement();
      if (node)
        nodes.push(node);
    }
    return nodes;
  }
  parseModuleDef() {
    this.expect("module");
    const line = this.current().line;
    const name = this.expect("identifier").value;
    const params = [];
    if (this.current().value === "(") {
      this.advance();
      while (this.current().value !== ")" && this.current().type !== "eof") {
        params.push(this.expect("identifier").value);
        if (this.current().value === ",") {
          this.advance();
        }
      }
      this.expect(")");
    }
    let body = [];
    if (this.current().value === "{") {
      this.advance();
      body = this.parseBlock();
      this.expect("}");
    }
    return {
      type: "module_def",
      name,
      params,
      body,
      line
    };
  }
  parseFunctionDef() {
    this.expect("function");
    const line = this.current().line;
    const name = this.expect("identifier").value;
    const params = [];
    if (this.current().value === "(") {
      this.advance();
      while (this.current().value !== ")" && this.current().type !== "eof") {
        params.push(this.expect("identifier").value);
        if (this.current().value === ",") {
          this.advance();
        }
      }
      this.expect(")");
    }
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
      line
    };
  }
  parseChildren() {
    this.expect("children");
    const line = this.current().line;
    let args = [];
    if (this.current().value === "(") {
      this.advance();
      if (this.current().value !== ")") {
        if (this.current().type === "identifier" || this.current().type === "number") {
          args.push(this.advance().value);
        } else {
          args.push(this.parsePrimary());
        }
        while (this.current().value === ",") {
          this.advance();
          if (this.current().type === "identifier" || this.current().type === "number") {
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
      line
    };
  }
  parseModuleCall() {
    const name = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();
    let children = [];
    if (this.current().value === "{") {
      this.advance();
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
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
      line
    };
  }
  parseAssignment() {
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
      line
    };
  }
  parseIf() {
    this.expect("if");
    const line = this.current().line;
    this.expect("(");
    const condition = this.parseExpression();
    this.expect(")");
    let thenBody = [];
    if (this.current().value === "{") {
      this.advance();
      thenBody = this.parseBlock();
      this.expect("}");
    } else {
      const node = this.parseStatement();
      if (node)
        thenBody = [node];
    }
    let elseBody;
    if (this.current().value === "else") {
      this.advance();
      if (this.current().value === "{") {
        this.advance();
        elseBody = this.parseBlock();
        this.expect("}");
      } else {
        const node = this.parseStatement();
        if (node)
          elseBody = [node];
      }
    }
    return {
      type: "if",
      condition,
      thenBody,
      elseBody,
      line
    };
  }
  parseEcho() {
    this.expect("echo");
    const line = this.current().line;
    this.expect("(");
    const values = [];
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
      line
    };
  }
  parseAssert() {
    this.expect("assert");
    const line = this.current().line;
    this.expect("(");
    const condition = this.parseExpression();
    let message = undefined;
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
      line
    };
  }
  parseExpression() {
    return this.parseTernary();
  }
  parseTernary() {
    let expr = this.parseLogicalOr();
    if (this.current().value === "?") {
      this.advance();
      const thenExpr = this.parseExpression();
      this.expect(":");
      const elseExpr = this.parseExpression();
      return {
        type: "ternary",
        condition: expr,
        thenExpr,
        elseExpr
      };
    }
    return expr;
  }
  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.current().value === "||") {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = {
        type: "expression",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  parseLogicalAnd() {
    let left = this.parseComparison();
    while (this.current().value === "&&") {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = {
        type: "expression",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  parseComparison() {
    let left = this.parseAdditive();
    while (["==", "!=", "<", ">", "<=", ">="].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: "expression",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (["+", "-"].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: "expression",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  parseMultiplicative() {
    let left = this.parseUnary();
    while (["*", "/", "%"].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: "expression",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  parseUnary() {
    if (this.current().value === "!" || this.current().value === "-") {
      const op = this.advance().value;
      const expr = this.parseUnary();
      return {
        type: "expression",
        operator: op,
        left: expr
      };
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const token = this.current();
    if (token.value === "(") {
      this.advance();
      const expr = this.parseExpression();
      this.expect(")");
      return expr;
    }
    if (token.type === "identifier" && this.peek().value === "(") {
      const name = this.advance().value;
      this.advance();
      const args = [];
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
        args
      };
    }
    return this.parseValue();
  }
  isPrimitive(word) {
    return [
      "cube",
      "sphere",
      "cylinder",
      "cone",
      "circle",
      "square",
      "polygon",
      "polyhedron",
      "text"
    ].includes(word);
  }
  isTransform(word) {
    return [
      "translate",
      "rotate",
      "scale",
      "mirror",
      "multmatrix",
      "color",
      "linear_extrude",
      "rotate_extrude",
      "projection"
    ].includes(word);
  }
  parseProjection() {
    const op = this.advance().value;
    const line = this.current().line;
    this.expect("(");
    const params = this.parseParameters();
    this.expect(")");
    let children = [];
    if (this.current().value === "{") {
      this.advance();
      children = this.parseBlock();
      this.expect("}");
    } else if (this.current().type !== "eof" && this.current().value !== ";") {
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
      line
    };
  }
  isBooleanOp(word) {
    return ["union", "difference", "intersection", "hull", "minkowski"].includes(word);
  }
  parseLet() {
    this.expect("let");
    const line = this.current().line;
    this.expect("(");
    const bindings = {};
    while (this.current().value !== ")" && this.current().type !== "eof") {
      const name = this.expect("identifier").value;
      this.expect("=");
      const value = this.parseExpression();
      bindings[name] = value;
      if (this.current().value === ",") {
        this.advance();
      }
    }
    this.expect(")");
    let body = [];
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
      line
    };
  }
  parseModifier() {
    const modifierToken = this.advance();
    return this.parseModifierWithToken(modifierToken);
  }
  parseModifierWithToken(modifierToken) {
    const modifier = modifierToken.value;
    const line = modifierToken.line;
    const child = this.parseStatement();
    if (!child) {
      this.error(`Expected statement after modifier '${modifier}'`);
      return {
        type: "modifier",
        modifier,
        child: {
          type: "primitive",
          op: "cube",
          params: { size: 0 },
          line
        },
        line
      };
    }
    return {
      type: "modifier",
      modifier,
      child,
      line
    };
  }
  getErrors() {
    return this.errors;
  }
}
function parseOpenSCAD(code) {
  try {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const errors = parser.getErrors();
    return {
      ast,
      errors,
      success: errors.length === 0
    };
  } catch (err) {
    return {
      ast: null,
      errors: [{
        message: err.message,
        line: 0,
        column: 0,
        code: "PARSER_ERROR"
      }],
      success: false
    };
  }
}
export {
  parseOpenSCAD
};
