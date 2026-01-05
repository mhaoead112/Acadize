// Script to replace all hardcoded localhost URLs with environment variable configuration
// Run this with: node replace-localhost-urls.js

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CONFIG_IMPORT = "import { apiEndpoint, assetUrl } from '@/lib/config';";

const replacements = [
  // API endpoint patterns
  { pattern: /'http:\/\/localhost:3001\/api\/([^']+)'/g, replacement: "apiEndpoint('/api/$1')" },
  { pattern: /"http:\/\/localhost:3001\/api\/([^"]+)"/g, replacement: 'apiEndpoint("/api/$1")' },
  { pattern: /`http:\/\/localhost:3001\/api\/([^`]+)`/g, replacement: 'apiEndpoint(`/api/$1`)' },
  
  // Asset URL patterns with template literals
  { pattern: /`http:\/\/localhost:3001\$\{([^}]+)\}`/g, replacement: 'assetUrl($1)' },
  { pattern: /'http:\/\/localhost:3001' \+ ([^;]+)/g, replacement: 'assetUrl($1)' },
];

function addImportIfNeeded(content) {
  // Check if config import already exists
  if (content.includes("from '@/lib/config'") || content.includes('from "@/lib/config"')) {
    return content;
  }

  // Find the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // No imports found, add at the top
    return CONFIG_IMPORT + '\n' + content;
  }

  // Insert after the last import
  importLines.splice(lastImportIndex + 1, 0, CONFIG_IMPORT);
  return importLines.join('\n');
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file contains localhost URLs
  if (!content.includes('localhost:3001')) {
    return;
  }

  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    // Add import if needed
    content = addImportIfNeeded(content);
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const items = readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = join(dirPath, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      processFile(fullPath);
    }
  });
}

// Start processing from client/src directory
const clientSrcPath = join(process.cwd(), 'client', 'src');
console.log('🔄 Starting localhost URL replacement...\n');
processDirectory(clientSrcPath);
console.log('\n✨ Replacement complete!');
