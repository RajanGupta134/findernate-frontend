#!/bin/bash

# Batch Yellow Color Replacement Script for FinderNate Frontend
# This script replaces all yellow Tailwind classes and hex colors with #ffd65c variants

echo "Starting batch yellow color replacement..."

# Navigate to src directory
cd src

# Function to replace colors in a file
replace_colors() {
    local file="$1"
    echo "Processing: $file"
    
    # Replace Tailwind yellow classes
    sed -i 's/\bbg-yellow-50\b/bg-[#fefdf5]/g' "$file"
    sed -i 's/\bbg-yellow-100\b/bg-[#fff5d6]/g' "$file"
    sed -i 's/\bbg-yellow-200\b/bg-[#ffe08a]/g' "$file"
    sed -i 's/\bbg-yellow-300\b/bg-[#ffd65c]/g' "$file"
    sed -i 's/\bbg-yellow-400\b/bg-[#ffd65c]/g' "$file"
    sed -i 's/\bbg-yellow-500\b/bg-[#ffd65c]/g' "$file"
    sed -i 's/\bbg-yellow-600\b/bg-[#cc9b2e]/g' "$file"
    sed -i 's/\bbg-yellow-700\b/bg-[#b8871f]/g' "$file"
    sed -i 's/\bbg-yellow-800\b/bg-[#a07319]/g' "$file"
    sed -i 's/\bbg-yellow-900\b/bg-[#8b6214]/g' "$file"
    
    # Replace text colors
    sed -i 's/\btext-yellow-50\b/text-[#fefdf5]/g' "$file"
    sed -i 's/\btext-yellow-100\b/text-[#fff5d6]/g' "$file"
    sed -i 's/\btext-yellow-200\b/text-[#ffe08a]/g' "$file"
    sed -i 's/\btext-yellow-300\b/text-[#ffd65c]/g' "$file"
    sed -i 's/\btext-yellow-400\b/text-[#ffd65c]/g' "$file"
    sed -i 's/\btext-yellow-500\b/text-[#ffd65c]/g' "$file"
    sed -i 's/\btext-yellow-600\b/text-[#cc9b2e]/g' "$file"
    sed -i 's/\btext-yellow-700\b/text-[#b8871f]/g' "$file"
    sed -i 's/\btext-yellow-800\b/text-[#a07319]/g' "$file"
    sed -i 's/\btext-yellow-900\b/text-[#8b6214]/g' "$file"
    
    # Replace border colors
    sed -i 's/\bborder-yellow-50\b/border-[#fefdf5]/g' "$file"
    sed -i 's/\bborder-yellow-100\b/border-[#fff5d6]/g' "$file"
    sed -i 's/\bborder-yellow-200\b/border-[#ffe08a]/g' "$file"
    sed -i 's/\bborder-yellow-300\b/border-[#ffd65c]/g' "$file"
    sed -i 's/\bborder-yellow-400\b/border-[#ffd65c]/g' "$file"
    sed -i 's/\bborder-yellow-500\b/border-[#ffd65c]/g' "$file"
    sed -i 's/\bborder-yellow-600\b/border-[#cc9b2e]/g' "$file"
    sed -i 's/\bborder-yellow-700\b/border-[#b8871f]/g' "$file"
    sed -i 's/\bborder-yellow-800\b/border-[#a07319]/g' "$file"
    sed -i 's/\bborder-yellow-900\b/border-[#8b6214]/g' "$file"
    
    # Replace hover states
    sed -i 's/\bhover:bg-yellow-50\b/hover:bg-[#fefdf5]/g' "$file"
    sed -i 's/\bhover:bg-yellow-100\b/hover:bg-[#fff5d6]/g' "$file"
    sed -i 's/\bhover:bg-yellow-200\b/hover:bg-[#ffe08a]/g' "$file"
    sed -i 's/\bhover:bg-yellow-300\b/hover:bg-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:bg-yellow-400\b/hover:bg-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:bg-yellow-500\b/hover:bg-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:bg-yellow-600\b/hover:bg-[#cc9b2e]/g' "$file"
    sed -i 's/\bhover:bg-yellow-700\b/hover:bg-[#b8871f]/g' "$file"
    sed -i 's/\bhover:bg-yellow-800\b/hover:bg-[#a07319]/g' "$file"
    sed -i 's/\bhover:bg-yellow-900\b/hover:bg-[#8b6214]/g' "$file"
    
    sed -i 's/\bhover:text-yellow-50\b/hover:text-[#fefdf5]/g' "$file"
    sed -i 's/\bhover:text-yellow-100\b/hover:text-[#fff5d6]/g' "$file"
    sed -i 's/\bhover:text-yellow-200\b/hover:text-[#ffe08a]/g' "$file"
    sed -i 's/\bhover:text-yellow-300\b/hover:text-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:text-yellow-400\b/hover:text-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:text-yellow-500\b/hover:text-[#ffd65c]/g' "$file"
    sed -i 's/\bhover:text-yellow-600\b/hover:text-[#cc9b2e]/g' "$file"
    sed -i 's/\bhover:text-yellow-700\b/hover:text-[#b8871f]/g' "$file"
    sed -i 's/\bhover:text-yellow-800\b/hover:text-[#a07319]/g' "$file"
    sed -i 's/\bhover:text-yellow-900\b/hover:text-[#8b6214]/g' "$file"
    
    # Replace gradient colors
    sed -i 's/\bfrom-yellow-50\b/from-[#fefdf5]/g' "$file"
    sed -i 's/\bfrom-yellow-100\b/from-[#fff5d6]/g' "$file"
    sed -i 's/\bfrom-yellow-200\b/from-[#ffe08a]/g' "$file"
    sed -i 's/\bfrom-yellow-300\b/from-[#ffd65c]/g' "$file"
    sed -i 's/\bfrom-yellow-400\b/from-[#ffd65c]/g' "$file"
    sed -i 's/\bfrom-yellow-500\b/from-[#ffd65c]/g' "$file"
    sed -i 's/\bfrom-yellow-600\b/from-[#cc9b2e]/g' "$file"
    sed -i 's/\bfrom-yellow-700\b/from-[#b8871f]/g' "$file"
    
    sed -i 's/\bto-yellow-50\b/to-[#fefdf5]/g' "$file"
    sed -i 's/\bto-yellow-100\b/to-[#fff5d6]/g' "$file"
    sed -i 's/\bto-yellow-200\b/to-[#ffe08a]/g' "$file"
    sed -i 's/\bto-yellow-300\b/to-[#ffd65c]/g' "$file"
    sed -i 's/\bto-yellow-400\b/to-[#ffd65c]/g' "$file"
    sed -i 's/\bto-yellow-500\b/to-[#ffd65c]/g' "$file"
    sed -i 's/\bto-yellow-600\b/to-[#cc9b2e]/g' "$file"
    sed -i 's/\bto-yellow-700\b/to-[#b8871f]/g' "$file"
    
    # Replace group hover states
    sed -i 's/\bgroup-hover:text-yellow-600\b/group-hover:text-[#cc9b2e]/g' "$file"
    sed -i 's/\bgroup-hover:bg-yellow-600\b/group-hover:bg-[#cc9b2e]/g' "$file"
    
    # Replace hex colors
    sed -i 's/#facc15/#ffd65c/g' "$file"
    sed -i 's/#eab308/#e6c045/g' "$file"
    sed -i 's/#ca8a04/#cc9b2e/g' "$file"
    sed -i 's/#a16207/#b8871f/g' "$file"
    sed -i 's/#92400e/#a07319/g' "$file"
    sed -i 's/#fbbf24/#ffd65c/g' "$file"
    sed -i 's/#f59e0b/#ffd65c/g' "$file"
    sed -i 's/#d97706/#cc9b2e/g' "$file"
    sed -i 's/#fde047/#ffd65c/g' "$file"
    sed -i 's/#fde68a/#ffe08a/g' "$file"
    sed -i 's/#fef3c7/#fff5d6/g' "$file"
    sed -i 's/#fffbeb/#fefdf5/g' "$file"
    sed -i 's/#fcd34d/#ffd65c/g' "$file"
}

# Find and process all files with yellow references
echo "Finding files with yellow references..."
files=$(rg -l "yellow-[0-9]+|#(facc15|ca8a04|eab308|f59e0b|d97706|92400e|fbbf24|f9a825|fcd34d|fde047|fde68a|fef3c7|fffbeb)" --glob="*.tsx" --glob="*.ts" --glob="*.css" .)

if [ -z "$files" ]; then
    echo "No files found with yellow references."
    exit 0
fi

count=0
total=$(echo "$files" | wc -l)

echo "Found $total files to process..."
echo

for file in $files; do
    if [ -f "$file" ]; then
        replace_colors "$file"
        ((count++))
        echo "Processed $count/$total files"
    fi
done

echo
echo "Batch replacement completed!"
echo "Processed $count files"
echo
echo "Color replacements made:"
echo "  yellow-50  → [#fefdf5] (lightest)"
echo "  yellow-100 → [#fff5d6] (very light)"
echo "  yellow-200 → [#ffe08a] (light)"
echo "  yellow-300 → [#ffd65c] (medium-light)"
echo "  yellow-400 → [#ffd65c] (base color)"
echo "  yellow-500 → [#ffd65c] (base color)"
echo "  yellow-600 → [#cc9b2e] (medium-dark)"
echo "  yellow-700 → [#b8871f] (dark)"
echo "  yellow-800 → [#a07319] (darker)"
echo "  yellow-900 → [#8b6214] (darkest)"
echo
echo "Hex color replacements:"
echo "  #facc15 → #ffd65c"
echo "  #eab308 → #e6c045" 
echo "  #ca8a04 → #cc9b2e"
echo "  #a16207 → #b8871f"
echo "  And other common yellow hex values..."