// Debug script for tokenization
import { Tokenizer } from './backend/scad-parser.ts';

function debugTokenization(code) {
  console.log(`=== Tokenizing: "${code}" ===`);
  const tokenizer = new Tokenizer(code);
  const tokens = tokenizer.tokenize();
  
  tokens.forEach((token, index) => {
    console.log(`${index}: ${token.type} "${token.value}" at ${token.line}:${token.column}`);
  });
}

debugTokenization('[ for (i=[0:10]) i*i ]');
debugTokenization('[i*i for i=[0:10]]');