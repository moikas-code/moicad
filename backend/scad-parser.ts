import type { ScadNode, ParseError, ParseResult } from '../shared/types';

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

  private isWhitespace(ch: string): boolean {
    return /\s/.test(ch);
  }

  private isDigit(ch: string): boolean {
    return /\d/.test(ch);
  }

  private isAlpha(ch: string): boolean {
    return /[a-zA-Z_]/.test(ch);
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private peek(offset = 0): string {
    const idx = this.pos + offset;
    return idx < this.input.length ? this.input[idx] : '';
  }

  private advance(): string {
    const ch = this.input[this.pos];
    this.pos++;
    if (ch === '\n') {
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
    if (this.peek() === '/' && this.peek(1) === '/') {
      // Single-line comment
      while (this.peek() && this.peek() !== '\n') {
        this.advance();
      }
      if (this.peek() === '\n') this.advance();
    } else if (this.peek() === '/' && this.peek(1) === '*') {
      // Multi-line comment
      this.advance(); // /
      this.advance(); // *
      while (!(this.peek() === '*' && this.peek(1) === '/')) {
        if (!this.peek()) break;
        this.advance();
      }
      if (this.peek() === '*') this.advance();
      if (this.peek() === '/') this.advance();
    }
  }

  private readString(quote: string): string {
    this.advance(); // Opening quote
    let result = '';
    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.peek();
        switch (escaped) {
          case 'n': result += '\n'; break;
          case 't': result += '\t'; break;
          case 'r': result += '\r'; break;
          case '\\': result += '\\'; break;
          case '"': result += '"'; break;
          case "'": result += "'"; break;
          default: result += escaped;
        }
        this.advance();
      } else {
        result += this.advance();
      }
    }
    if (this.peek() === quote) this.advance(); // Closing quote
    return result;
  }

  private readNumber(): string {
    let result = '';
    while (this.isDigit(this.peek()) || this.peek() === '.') {
      result += this.advance();
    }
    if ((this.peek() === 'e' || this.peek() === 'E') &&
        (this.isDigit(this.peek(1)) || this.peek(1) === '-')) {
      result += this.advance(); // e or E
      if (this.peek() === '-' || this.peek() === '+') result += this.advance();
      while (this.isDigit(this.peek())) result += this.advance();
    }
    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '$') {
      result += this.advance();
    }
    return result;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      this.skipComment();
      this.skipWhitespace();

      if (this.pos >= this.input.length) break;

      const ch = this.peek();
      const line = this.line;
      const column = this.column;

      if (ch === '"' || ch === "'") {
        const str = this.readString(ch);
        tokens.push({ type: 'string', value: str, line, column });
      } else if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        if (ch === '-') this.advance();
        const num = this.readNumber();
        tokens.push({
          type: 'number',
          value: parseFloat((ch === '-' ? '-' : '') + num),
          line,
          column,
        });
      } else if (this.isAlpha(ch) || ch === '$' || ch === '_') {
        const id = this.readIdentifier();
        const type = this.isKeyword(id) ? id : 'identifier';
        tokens.push({ type: type as any, value: id, line, column });
      } else {
        // Operators and punctuation
        const twoChar = ch + this.peek(1);
        if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
          this.advance();
          this.advance();
          tokens.push({ type: 'operator', value: twoChar, line, column });
        } else if (['!', '<', '>', '+', '-', '*', '/', '%', '='].includes(ch)) {
          this.advance();
          tokens.push({ type: 'operator', value: ch, line, column });
        } else {
          const punct = this.advance();
          tokens.push({ type: 'punctuation', value: punct, line, column });
        }
      }
    }

    tokens.push({ type: 'eof', value: '', line: this.line, column: this.column });
    return tokens;
  }

  private isKeyword(word: string): boolean {
    return [
      'cube', 'sphere', 'cylinder', 'cone', 'circle', 'square', 'polygon',
      'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
      'union', 'difference', 'intersection', 'hull', 'minkowski',
      'for', 'let', 'function', 'module', 'children',
      'if', 'else', 'echo',
    ].includes(word);
  }
}

interface Token {
  type: string;
  value: any;
  line: number;
  column: number;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: 'eof', value: '', line: 0, column: 0 };
  }

  private peek(offset = 1): Token {
    const idx = this.pos + offset;
    return this.tokens[idx] || { type: 'eof', value: '', line: 0, column: 0 };
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
      code: 'SYNTAX_ERROR',
    });
  }

  public parse(): ScadNode[] {
    const nodes: ScadNode[] = [];

    while (this.current().type !== 'eof') {
      const node = this.parseStatement();
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private parseStatement(): ScadNode | null {
    const token = this.current();

    if (token.type === 'eof') return null;

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

    // Check for for loop
    if (token.value === 'for') {
      return this.parseForLoop();
    }

    // Check for children
    if (token.value === 'children') {
      return this.parseChildren();
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
      type: 'primitive',
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
    if (this.current().value === '{') {
      // Block with braces
      this.advance(); // {
      children = this.parseBlock();
      this.expect('}');
    } else if (this.current().type !== 'eof' && this.current().value !== ';') {
      // Single statement child (OpenSCAD syntax: translate([1,0,0]) cube(10);)
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }

    return {
      type: 'transform',
      op: op as any,
      params,
      children,
      line,
    };
  }

  private parseBooleanOp(): ScadNode {
    const op = this.advance().value;
    const line = this.current().line;

    let children: ScadNode[] = [];
    if (this.current().value === '(') {
      this.advance(); // (
      if (this.current().value !== ')') {
        children = this.parseBlock();
      }
      this.expect(')');
    } else if (this.current().value === '{') {
      this.advance(); // {
      children = this.parseBlock();
      this.expect('}');
    }

    return {
      type: 'boolean',
      op: op as any,
      children,
      line,
    };
  }

  private parseForLoop(): ScadNode {
    this.expect('for');
    const line = this.current().line;
    this.expect('(');

    const variable = this.expect('identifier').value;
    this.expect('=');
    const range = this.parseRange();

    this.expect(')');

    let body: ScadNode[] = [];
    if (this.current().value === '{') {
      this.advance();
      body = this.parseBlock();
      this.expect('}');
    }

    return {
      type: 'for',
      variable,
      range: range as any,
      body,
      line,
    };
  }

  private parseChildren(): ScadNode {
    this.expect('children');
    const line = this.current().line;

    let children: ScadNode[] = [];
    if (this.current().value === '(') {
      this.advance();
      if (this.current().value !== ')') {
        children = this.parseBlock();
      }
      this.expect(')');
    }

    return {
      type: 'children',
      children,
      line,
    };
  }

  private parseParameters(): Record<string, any> {
    const params: Record<string, any> = {};

    if (this.current().value !== '(') {
      return params;
    }

    this.advance(); // (

    while (this.current().value !== ')' && this.current().type !== 'eof') {
      if (this.current().type === 'identifier') {
        const name = this.advance().value;
        if (this.current().value === '=') {
          this.advance(); // =
          const value = this.parseValue();
          params[name] = value;

          if (this.current().value === ',') {
            this.advance();
          }
        }
      } else {
        // Positional parameter (for some primitives)
        params['_positional'] = this.parseValue();
        if (this.current().value === ',') {
          this.advance();
        }
      }
    }

    if (this.current().value === ')') {
      this.advance();
    }

    return params;
  }

  private parseValue(): any {
    const token = this.current();

    // Handle unary minus
    if (token.type === 'operator' && token.value === '-') {
      this.advance();
      const next = this.parseValue();
      return typeof next === 'number' ? -next : null;
    }

    if (token.type === 'number') {
      this.advance();
      return token.value;
    }

    if (token.type === 'string') {
      this.advance();
      return token.value;
    }

    if (token.value === '[') {
      return this.parseArray();
    }

    if (token.type === 'identifier') {
      return this.advance().value;
    }

    return null;
  }

  private parseArray(): any[] {
    this.expect('[');
    const arr: any[] = [];

    while (this.current().value !== ']' && this.current().type !== 'eof') {
      arr.push(this.parseValue());

      if (this.current().value === ',') {
        this.advance();
      }
    }

    this.expect(']');
    return arr;
  }

  private parseRange(): [number, number] | [number, number, number] {
    const start = this.parseValue();
    let step: number | undefined;
    let end: number;

    this.expect(':');

    // Check if there's a step
    if (this.current().type === 'number') {
      const next = this.parseValue();
      if (this.current().value === ':') {
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

  private parseBlock(): ScadNode[] {
    const nodes: ScadNode[] = [];

    while (this.current().value !== '}' && this.current().type !== 'eof') {
      const node = this.parseStatement();
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private isPrimitive(word: string): boolean {
    return [
      'cube', 'sphere', 'cylinder', 'cone', 'circle', 'square', 'polygon', 'polyhedron',
    ].includes(word);
  }

  private isTransform(word: string): boolean {
    return [
      'translate', 'rotate', 'scale', 'mirror', 'multmatrix',
      'minkowski',
    ].includes(word);
  }

  private isBooleanOp(word: string): boolean {
    return ['union', 'difference', 'intersection', 'hull'].includes(word);
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
      errors: [{
        message: err.message,
        line: 0,
        column: 0,
        code: 'PARSER_ERROR',
      }],
      success: false,
    };
  }
}
