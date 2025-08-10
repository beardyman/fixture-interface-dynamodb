const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Generates TypeScript declaration file using tsc --allowJs from JSDoc comments
 */
function generateDts() {
  const sourcePath = path.join(__dirname, '../index.js');
  const dtsPath = path.join(__dirname, '../dist/index.d.ts');
  
  try {
    // Ensure dist directory exists
    const distDir = path.dirname(dtsPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    // Generate .d.ts file directly from JavaScript with JSDoc using tsc
    execSync(`npx tsc --declaration --emitDeclarationOnly --allowJs --skipLibCheck --outDir dist ${path.basename(sourcePath)}`, {
      cwd: path.dirname(__dirname),
      stdio: 'pipe'
    });
    
    // The generated file will be dist/index.d.ts - check if it exists and clean it up
    if (fs.existsSync(dtsPath)) {
      let dtsContent = fs.readFileSync(dtsPath, 'utf8');
      
      // Clean up the generated content - remove require declarations and fix exports
      dtsContent = dtsContent
        .replace(/declare const \w+: any;\n/g, '') // Remove require declarations
        .replace(/^export = (\w+);/m, '') // Remove export at top
        .trim();
      
      // Add proper exports at the end
      dtsContent += `\n\ndeclare namespace DynamoFx {}\n\nexport = DynamoFx;\nexport default DynamoFx;`;
      
      fs.writeFileSync(dtsPath, dtsContent);
      console.log('✓ Generated TypeScript declarations using tsc');
    } else {
      throw new Error('TypeScript compiler did not generate declaration file');
    }
    
  } catch (error) {
    console.error('Error generating TypeScript declarations:', error.message);
    // Fallback: copy the existing manual d.ts file if generation fails
    const manualDtsPath = path.join(__dirname, '../index.d.ts.backup');
    if (fs.existsSync(manualDtsPath)) {
      fs.copyFileSync(manualDtsPath, dtsPath);
      console.log('⚠️  Using fallback TypeScript declarations');
    } else {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  generateDts();
}

module.exports = { generateDts };