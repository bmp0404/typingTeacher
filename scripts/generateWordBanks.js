// generateWordBanks.js
// Run: node generateWordBanks.js
// Outputs: ../frontend/src/wordBanks.json
//
// Generates:
//   homeRow     - words using only home row keys (a s d f g h j k l)
//   topRow      - words using only top row keys (q w e r t y u i o p)
//   bigramWords - map of bigram -> words containing that bigram (used by adaptive mode)

const words = require('an-array-of-english-words');
const fs = require('fs');
const path = require('path');

const HOME_ROW = new Set(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']);
const TOP_ROW  = new Set(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']);

const MIN_LEN = 3;
const MAX_LEN = 10;
const MAX_PER_BIGRAM = 100; // cap per bigram to keep JSON size reasonable

// Base filter: lowercase alphabetic, length 3-10
const filtered = words.filter(word => {
  if (word.length < MIN_LEN || word.length > MAX_LEN) return false;
  if (!/^[a-z]+$/.test(word)) return false;
  return true;
});

console.log(`Total filtered words: ${filtered.length}`);

// Drill mode word lists
const homeRow = filtered.filter(word => [...word].every(c => HOME_ROW.has(c)));
const topRow  = filtered.filter(word => [...word].every(c => TOP_ROW.has(c)));

console.log(`Home row words: ${homeRow.length}`);
console.log(`Top row words:  ${topRow.length}`);

// Bigram → words mapping
// Each word contributes to every bigram it contains.
// Words are added in filtered order (roughly alphabetical) up to the cap.
const bigramWords = {};

for (const word of filtered) {
  for (let i = 0; i < word.length - 1; i++) {
    const bigram = word[i] + word[i + 1];
    if (!bigramWords[bigram]) bigramWords[bigram] = [];
    if (bigramWords[bigram].length < MAX_PER_BIGRAM) {
      bigramWords[bigram].push(word);
    }
  }
}

console.log(`Unique bigrams mapped: ${Object.keys(bigramWords).length}`);

const output = { homeRow, topRow, bigramWords };

const outPath = path.resolve(__dirname, '../frontend/src/wordBanks.json');
fs.writeFileSync(outPath, JSON.stringify(output));

const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
console.log(`Written to ${outPath} (${sizeKB} KB)`);
