const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color mapping for yellow replacements with #ffd65c base
const colorMappings = {
  // Tailwind yellow classes to custom hex values
  'yellow-50': '[#fefdf5]',    // Lightest
  'yellow-100': '[#fff5d6]',   // Very light
  'yellow-200': '[#ffe08a]',   // Light
  'yellow-300': '[#ffd65c]',   // Medium-light (our base color)
  'yellow-400': '[#ffd65c]',   // Base color
  'yellow-500': '[#ffd65c]',   // Base color 
  'yellow-600': '[#cc9b2e]',   // Medium-dark
  'yellow-700': '[#b8871f]',   // Dark
  'yellow-800': '[#a07319]',   // Darker
  'yellow-900': '[#8b6214]',   // Darkest

  // Hex color replacements
  '#facc15': '#ffd65c',  // yellow-400 equivalent
  '#eab308': '#e6c045',  // yellow-500 equivalent (darker variant)
  '#ca8a04': '#cc9b2e',  // yellow-600 equivalent
  '#a16207': '#b8871f',  // yellow-700 equivalent
  '#92400e': '#a07319',  // yellow-800 equivalent
  '#fbbf24': '#ffd65c',  // Another yellow variant
  '#f59e0b': '#ffd65c',  // Another yellow variant
  '#d97706': '#cc9b2e',  // Orange-yellow variant
  '#fde047': '#ffd65c',  // Light yellow
  '#fde68a': '#ffe08a',  // Very light yellow
  '#fef3c7': '#fff5d6',  // Extremely light yellow
  '#fffbeb': '#fefdf5',  // Almost white yellow
  '#fcd34d': '#ffd65c',  // Medium yellow
};

function replaceColorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace Tailwind classes
    for (const [oldClass, newClass] of Object.entries(colorMappings)) {
      if (oldClass.startsWith('yellow-')) {
        // Handle various Tailwind prefixes
        const patterns = [
          new RegExp(`\\bbg-${oldClass}\\b`, 'g'),
          new RegExp(`\\btext-${oldClass}\\b`, 'g'),
          new RegExp(`\\bborder-${oldClass}\\b`, 'g'),
          new RegExp(`\\bhover:bg-${oldClass}\\b`, 'g'),
          new RegExp(`\\bhover:text-${oldClass}\\b`, 'g'),
          new RegExp(`\\bhover:border-${oldClass}\\b`, 'g'),
          new RegExp(`\\bfrom-${oldClass}\\b`, 'g'),
          new RegExp(`\\bto-${oldClass}\\b`, 'g'),
          new RegExp(`\\bvia-${oldClass}\\b`, 'g'),
          new RegExp(`\\bring-${oldClass}\\b`, 'g'),
          new RegExp(`\\bfocus:ring-${oldClass}\\b`, 'g'),
          new RegExp(`\\bgroup-hover:text-${oldClass}\\b`, 'g'),
          new RegExp(`\\bgroup-hover:bg-${oldClass}\\b`, 'g'),
        ];
        
        for (const pattern of patterns) {
          const replacement = pattern.source.replace(oldClass, newClass);
          const newContent = content.replace(pattern, replacement.replace(/\\b|\\./g, ''));
          if (newContent !== content) {
            content = newContent;
            modified = true;
          }
        }
      } else if (oldClass.startsWith('#')) {
        // Handle hex color replacements
        const hexPattern = new RegExp(oldClass.replace('#', '#'), 'g');
        const newContent = content.replace(hexPattern, newClass);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      //console.log(`Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFilesWithYellow(directory) {
  try {
    const command = `rg -l "yellow-[0-9]+|#(facc15|ca8a04|eab308|f59e0b|d97706|92400e|fbbf24|f9a825|fcd34d|fde047|fde68a|fef3c7|fffbeb)" --glob="*.tsx" --glob="*.ts" --glob="*.css" "${directory}"`;
    const result = execSync(command, { encoding: 'utf8' });
    return result.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    //console.log('No more files found or ripgrep not available');
    return [];
  }
}

function main() {
  const srcDirectory = path.join(__dirname, 'src');
  //console.log('Starting yellow color replacement...');
  
  const files = findFilesWithYellow(srcDirectory);
  //console.log(`Found ${files.length} files with yellow references`);
  
  let updatedCount = 0;
  for (const file of files) {
    const fullPath = path.resolve(file);
    if (replaceColorsInFile(fullPath)) {
      updatedCount++;
    }
  }
  
  //console.log(`\nCompleted! Updated ${updatedCount} files out of ${files.length}`);
  //console.log('\nColor mapping applied:');
  //console.log('- Light shades (50-200) → Light tints of #ffd65c');
  //console.log('- Medium shades (300-500) → #ffd65c (base color)');
  //console.log('- Dark shades (600-900) → Darker variants of #ffd65c');
  //console.log('- Hex colors → Corresponding #ffd65c variants');
}

if (require.main === module) {
  main();
}

module.exports = { replaceColorsInFile, colorMappings };