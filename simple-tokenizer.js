// Simple tokenizer test
const code = '[ for (i = [0:5]) i ]';

// Manually implement quick tokenizer to debug
class SimpleTokenizer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
  }
  
  peek() {
    return this.input[this.pos] || '';
  }
  
  advance() {
    return this.input[this.pos++];
  }
  
  skipWhitespace() {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }
  
  readIdentifier() {
    let result = '';
    while (/[a-zA-Z_]/.test(this.peek())) {
      result += this.advance();
    }
    return result;
  }
  
  tokenize() {
    const tokens = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;
      
      const ch = this.peek();
      console.log(`Position ${this.pos}: char '${ch}' (${ch.charCodeAt(0)})`);
      
      if (/[a-zA-Z_]/.test(ch)) {
        const id = this.readIdentifier();
        console.log(`Read identifier: '${id}'`);
        tokens.push({ type: 'identifier', value: id });
      } else {
        this.advance();
        tokens.push({ type: 'char', value: ch });
      }
    }
    return tokens;
  }
}

const tokenizer = new SimpleTokenizer(code);
const tokens = tokenizer.tokenize();
console.log('Tokens:', tokens);