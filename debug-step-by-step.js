import { parseOpenSCAD } from './backend/scad-parser.ts';

console.log('1. Testing "[ for":');
try {
  const result1 = parseOpenSCAD('[ for');
  console.log('Success:', result1.success);
} catch (e) {
  console.log('Exception:', e.message);
}

console.log('\n2. Testing "[ for (":');
try {
  const result2 = parseOpenSCAD('[ for (');
  console.log('Success:', result2.success);
} catch (e) {
  console.log('Exception:', e.message);
}

console.log('\n3. Testing "[ for (i":');
try {
  const result3 = parseOpenSCAD('[ for (i');
  console.log('Success:', result3.success);
} catch (e) {
  console.log('Exception:', e.message);
}

console.log('\n4. Testing "[ for (i =":');
try {
  const result4 = parseOpenSCAD('[ for (i =');
  console.log('Success:', result4.success);
} catch (e) {
  console.log('Exception:', e.message);
}

console.log('\n5. Testing "[ for (i = [":');
try {
  setTimeout(() => {
    console.log('TIMEOUT on step 5!');
    process.exit(1);
  }, 2000);
  
  const result5 = parseOpenSCAD('[ for (i = [');
  console.log('Success:', result5.success);
} catch (e) {
  console.log('Exception:', e.message);
}
