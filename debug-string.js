// Debug exact test case
console.log('Test case: [ for (i = [0:5]) i ]');
console.log('Length:', '[ for (i = [0:5]) i ]'.length);
for (let i = 0; i < '[ for (i = [0:5]) i ]'.length; i++) {
  console.log(i, "'", '[ for (i = [0:5]) i ]'[i], "'", '[ for (i = [0:5]) i ]'.charCodeAt(i));
}