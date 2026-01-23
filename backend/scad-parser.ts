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
    return idx < this.input.length ? this.input[idx]! : '';
  }

  private advance(): string {
    const ch = this.input[this.pos]!;
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
    resetTokenPool(); // Reset pool for fresh parsing
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
        const token = getOrCreateToken();
        token.type = 'string';
        token.value = str;
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
        if (ch === '-') this.advance();
        const num = this.readNumber();
        const token = getOrCreateToken();
        token.type = 'number';
        token.value = parseFloat((ch === '-' ? '-' : '') + num);
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else if (this.isAlpha(ch) || ch === '$' || ch === '_') {
        const id = this.readIdentifier();
        const type = this.isKeyword(id) ? id : 'identifier';
        const token = getOrCreateToken();
        token.type = type as string;
        token.value = id;
        token.line = line;
        token.column = column;
        tokens.push(token);
      } else {
        // Operators and punctuation
        const twoChar = ch + this.peek(1);
        if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
          this.advance();
          this.advance();
          const token = getOrCreateToken();
          token.type = 'operator';
          token.value = twoChar;
          token.line = line;
          token.column = column;
          tokens.push(token);
        } else if (['!', '<', '>', '+', '-', '*', '/', '%', '=', '?', ':'].includes(ch)) {
          this.advance();
          const token = getOrCreateToken();
          token.type = 'operator';
          token.value = ch;
          token.line = line;
          token.column = column;
          tokens.push(token);
        } else {
          const punct = this.advance();
          const token = getOrCreateToken();
          token.type = 'punctuation';
          token.value = punct;
          token.line = line;
          token.column = column;
          tokens.push(token);
        }
      }
    }

    const eofToken = getOrCreateToken();
    eofToken.type = 'eof';
    eofToken.value = '';
    eofToken.line = this.line;
    eofToken.column = this.column;
    tokens.push(eofToken);
    
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

// Simple token reuse array for memory efficiency
const tokenReusePool: Token[] = [];
let tokenPoolIndex = 0;

function getOrCreateToken(): Token {
  if (tokenPoolIndex < tokenReusePool.length) {
    const token = tokenReusePool[tokenPoolIndex++]!;
    // Reset properties
    token.type = '';
    token.value = null;
    token.line = 0;
    token.column = 0;
    return token;
  }
  
  const token: Token = {
    type: '',
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

    // Skip semicolons
    if (token.value === ';') {
      this.advance();
      return null;
    }

    // Module definition
    if (token.value === 'module') {
      return this.parseModuleDef();
    }

    // Function definition
    if (token.value === 'function') {
      return this.parseFunctionDef();
    }

    // If statement
    if (token.value === 'if') {
      return this.parseIf();
    }

    // Echo statement
    if (token.value === 'echo') {
      return this.parseEcho();
    }

    // Assert statement
    if (token.value === 'assert') {
      return this.parseAssert();
    }

    // Variable assignment (identifier followed by =)
    if (token.type === 'identifier' && this.peek().value === '=') {
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

    // Check for for loop
    if (token.value === 'for') {
      return this.parseForLoop();
    }

    // Check for children
    if (token.value === 'children') {
      return this.parseChildren();
    }

    // Module call (user-defined module)
    if (token.type === 'identifier') {
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
      // Check if this is a named parameter (identifier = value)
      if (this.current().type === 'identifier' && this.peek().value === '=') {
        const name = this.advance().value;
        this.advance(); // =
        const value = this.parseExpression();
        params[name] = value;

        if (this.current().value === ',') {
          this.advance();
        }
      } else {
        // Positional parameter - could be any expression
        params['_positional'] = this.parseExpression();
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

    while (this.current().value !== '}' && this.current().value !== ')' && this.current().type !== 'eof') {
      const node = this.parseStatement();
      if (node) nodes.push(node);
    }

    return nodes;
  }

  private parseModuleDef(): ScadNode {
    this.expect('module');
    const line = this.current().line;
    const name = this.expect('identifier').value;

    // Parse parameters
    const params: string[] = [];
    if (this.current().value === '(') {
      this.advance(); // (
      while (this.current().value !== ')' && this.current().type !== 'eof') {
        params.push(this.expect('identifier').value);
        if (this.current().value === ',') {
          this.advance();
        }
      }
      this.expect(')');
    }

    // Parse body
    let body: ScadNode[] = [];
    if (this.current().value === '{') {
      this.advance(); // {
      body = this.parseBlock();
      this.expect('}');
    }

    return {
      type: 'module_def',
      name,
      params,
      body,
      line,
    };
  }

  private parseFunctionDef(): ScadNode {
    this.expect('function');
    const line = this.current().line;
    const name = this.expect('identifier').value;

    // Parse parameters
    const params: string[] = [];
    if (this.current().value === '(') {
      this.advance(); // (
      while (this.current().value !== ')' && this.current().type !== 'eof') {
        params.push(this.expect('identifier').value);
        if (this.current().value === ',') {
          this.advance();
        }
      }
      this.expect(')');
    }

    // Parse expression (function body = expression)
    this.expect('=');
    const expression = this.parseExpression();
    if (this.current().value === ';') {
      this.advance();
    }

    return {
      type: 'function_def',
      name,
      params,
      expression,
      line,
    };
  }

  private parseModuleCall(): ScadNode {
    const name = this.advance().value;
    const line = this.current().line;
    const params = this.parseParameters();

    let children: ScadNode[] = [];
    if (this.current().value === '{') {
      this.advance(); // {
      children = this.parseBlock();
      this.expect('}');
    } else if (this.current().type !== 'eof' && this.current().value !== ';') {
      // Single statement child
      const child = this.parseStatement();
      if (child) {
        children = [child];
      }
    }

    return {
      type: 'module_call',
      name,
      params,
      children,
      line,
    };
  }

  private parseAssignment(): ScadNode {
    const name = this.advance().value;
    const line = this.current().line;
    this.expect('=');
    const value = this.parseExpression();
    if (this.current().value === ';') {
      this.advance();
    }

    return {
      type: 'assignment',
      name,
      value,
      line,
    };
  }

  private parseIf(): ScadNode {
    this.expect('if');
    const line = this.current().line;

    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');

    let thenBody: ScadNode[] = [];
    if (this.current().value === '{') {
      this.advance(); // {
      thenBody = this.parseBlock();
      this.expect('}');
    } else {
      const node = this.parseStatement();
      if (node) thenBody = [node];
    }

    let elseBody: ScadNode[] | undefined;
    if (this.current().value === 'else') {
      this.advance();
      if (this.current().value === '{') {
        this.advance(); // {
        elseBody = this.parseBlock();
        this.expect('}');
      } else {
        const node = this.parseStatement();
        if (node) elseBody = [node];
      }
    }

    return {
      type: 'if',
      condition,
      thenBody,
      elseBody,
      line,
    };
  }

  private parseEcho(): ScadNode {
    this.expect('echo');
    const line = this.current().line;
    this.expect('(');

    const values: any[] = [];
    while (this.current().value !== ')' && this.current().type !== 'eof') {
      values.push(this.parseExpression());
      if (this.current().value === ',') {
        this.advance();
      }
    }

    this.expect(')');
    if (this.current().value === ';') {
      this.advance();
    }

    return {
      type: 'echo',
      values,
      line,
    };
  }

  private parseAssert(): ScadNode {
    this.expect('assert');
    const line = this.current().line;
    this.expect('(');

    const condition = this.parseExpression();
    let message: any = undefined;

    if (this.current().value === ',') {
      this.advance();
      message = this.parseExpression();
    }

    this.expect(')');
    if (this.current().value === ';') {
      this.advance();
    }

    return {
      type: 'assert',
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

    if (this.current().value === '?') {
      this.advance(); // ?
      const thenExpr = this.parseExpression();
      this.expect(':');
      const elseExpr = this.parseExpression();
      return {
        type: 'ternary',
        condition: expr,
        thenExpr,
        elseExpr,
      };
    }

    return expr;
  }

  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();

    while (this.current().value === '||') {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = {
        type: 'expression',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseLogicalAnd(): any {
    let left = this.parseComparison();

    while (this.current().value === '&&') {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = {
        type: 'expression',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseComparison(): any {
    let left = this.parseAdditive();

    while (['==', '!=', '<', '>', '<=', '>='].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: 'expression',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseAdditive(): any {
    let left = this.parseMultiplicative();

    while (['+', '-'].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: 'expression',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseMultiplicative(): any {
    let left = this.parseUnary();

    while (['*', '/', '%'].includes(this.current().value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: 'expression',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  private parseUnary(): any {
    if (this.current().value === '!' || this.current().value === '-') {
      const op = this.advance().value;
      const expr = this.parseUnary();
      return {
        type: 'expression',
        operator: op,
        left: expr,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const token = this.current();

    // Parenthesized expression
    if (token.value === '(') {
      this.advance(); // (
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    // Function call
    if (token.type === 'identifier' && this.peek().value === '(') {
      const name = this.advance().value;
      this.advance(); // (

      const args: any[] = [];
      while (this.current().value !== ')' && this.current().type !== 'eof') {
        args.push(this.parseExpression());
        if (this.current().value === ',') {
          this.advance();
        }
      }
      this.expect(')');

      return {
        type: 'function_call',
        name,
        args,
      };
    }

    // Regular value
    return this.parseValue();
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
