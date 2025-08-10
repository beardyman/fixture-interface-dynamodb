const fs = require('fs');
const path = require('path');

// Ensure dist directories exist
const cjsDir = path.join(__dirname, '../dist/cjs');
const esmDir = path.join(__dirname, '../dist/esm');

if (!fs.existsSync(cjsDir)) {
  fs.mkdirSync(cjsDir, { recursive: true });
}

if (!fs.existsSync(esmDir)) {
  fs.mkdirSync(esmDir, { recursive: true });
}

// Read the CommonJS source
const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');

// Convert CommonJS to ESM
const esmSource = source
  .replace(/^'use strict';\s*$/m, '')
  .replace(/const\s+(\w+)\s+=\s+require\(['"]([^'"]+)['"]\);/g, "import $1 from '$2';")
  .replace(/module\.exports\s*=\s*(\w+);/, 'export default $1;')
  .trim();

// Write the ESM version
fs.writeFileSync(path.join(esmDir, 'index.js'), esmSource);

// Generate package.json files for module type specification
const cjsPackageJson = {
  "type": "commonjs"
};

const esmPackageJson = {
  "type": "module"
};

// Write package.json files
fs.writeFileSync(path.join(cjsDir, 'package.json'), JSON.stringify(cjsPackageJson, null, 2));
fs.writeFileSync(path.join(esmDir, 'package.json'), JSON.stringify(esmPackageJson, null, 2));

console.log('ESM build complete');