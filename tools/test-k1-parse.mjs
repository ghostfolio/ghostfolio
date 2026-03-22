/**
 * Test script: runs the PdfParseExtractor logic directly on a K-1 PDF
 * and prints all extracted fields, metadata, and unmapped items.
 *
 * Usage: node tools/test-k1-parse.mjs <path-to-pdf>
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── pdfjs-dist setup ──
const { getDocument, GlobalWorkerOptions } = await import(
  'pdfjs-dist/legacy/build/pdf.mjs'
);

const workerPath =
  'file:///' +
  resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs').replace(
    /\\/g,
    '/'
  );
GlobalWorkerOptions.workerSrc = workerPath;

// ── Load k1-position-regions (need TS compilation) ──
// For simplicity, inline the region definitions from the compiled output.
// Instead, we'll replicate the core extraction logic here using the raw
// coordinates from the TypeScript file.

// Actually, let's just load the TS file via tsx or esbuild-register...
// Simplest approach: read the compiled JS from dist or use a bundler.
// For now, let's inline the critical logic.

const POSITION_TOLERANCE = 15;
const SUBTYPE_Y_TOLERANCE = 8;

// ── Import the regions by dynamically compiling the TS ──
// We'll use a quick inline approach: load the raw TS and eval via esbuild

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

// Build a temp bundle of just the regions file
const regionsTsPath = resolve(
  'apps/api/src/app/k1-import/extractors/k1-position-regions.ts'
);
const regionsTmpPath = resolve('tools/_tmp_regions.mjs');

try {
  execSync(
    `npx esbuild "${regionsTsPath}" --bundle --format=esm --outfile="${regionsTmpPath}" --platform=node`,
    { stdio: 'pipe' }
  );
} catch (e) {
  console.error('Failed to compile regions file:', e.stderr?.toString());
  process.exit(1);
}

const regionsModule = await import('file:///' + regionsTmpPath.replace(/\\/g, '/'));
const K1_POSITION_REGIONS = regionsModule.K1_POSITION_REGIONS;

// Clean up
try { unlinkSync(regionsTmpPath); } catch {}

// ── PDF parsing ──
const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node tools/test-k1-parse.mjs <path-to-pdf>');
  process.exit(1);
}

const buffer = readFileSync(pdfPath);
const loadingTask = getDocument({
  data: new Uint8Array(buffer),
  standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
  cMapUrl: resolve('node_modules/pdfjs-dist/cmaps') + '/',
  cMapPacked: true,
  isEvalSupported: false,
  disableFontFace: true
});

const pdfDoc = await loadingTask.promise;
const page = await pdfDoc.getPage(1);
const textContent = await page.getTextContent({ includeMarkedContent: false });
const items = textContent.items;
const styles = textContent.styles;

// Filter data items (non-serif)
const dataItems = [];
for (const item of items) {
  const text = item.str.trim();
  if (!text) continue;
  const style = styles[item.fontName];
  if (!style) continue;
  const fontFamily = style.fontFamily.toLowerCase();
  if (fontFamily === 'serif') continue;
  dataItems.push({
    text,
    x: item.transform[4],
    y: item.transform[5],
    fontName: item.fontName,
    fontFamily,
    matched: false
  });
}

console.log(`Total data items: ${dataItems.length}\n`);

// ── Parsing logic (mirrors PdfParseExtractor) ──
function parseNumericValue(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (['SEE STMT', 'STMT', 'SEE STATEMENT', 'X', 'E-FILE', 'YES', 'NO'].includes(upper))
    return null;
  let cleaned = trimmed;
  const isParenNeg = /^\(.*\)$/.test(cleaned);
  cleaned = cleaned.replace(/[$,()]/g, '');
  const isMinusNeg = cleaned.startsWith('-');
  if (isMinusNeg) cleaned = cleaned.substring(1);
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return isParenNeg || isMinusNeg ? -num : num;
}

function findBestItemInRegion(items, region) {
  let bestItem = null;
  let bestDist = Infinity;
  const cx = (region.xMin + region.xMax) / 2;
  const cy = (region.yMin + region.yMax) / 2;
  for (const item of items) {
    if (item.matched) continue;
    if (
      item.x >= region.xMin - POSITION_TOLERANCE &&
      item.x <= region.xMax + POSITION_TOLERANCE &&
      item.y >= region.yMin - POSITION_TOLERANCE &&
      item.y <= region.yMax + POSITION_TOLERANCE
    ) {
      const dx = Math.abs(item.x - cx);
      const dy = Math.abs(item.y - cy);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        bestItem = item;
      }
    }
  }
  return bestItem;
}

const fields = [];
const metadata = {
  partnershipName: null,
  partnershipEin: null,
  partnerName: null,
  partnerEin: null,
  taxYear: null,
  isAmended: false,
  isFinal: false
};

// Closest-center assignment helper
function assignItemsToRegions(items, regions) {
  const candidates = [];
  for (const item of items) {
    if (item.matched) continue;
    for (const region of regions) {
      if (
        item.x >= region.xMin - POSITION_TOLERANCE &&
        item.x <= region.xMax + POSITION_TOLERANCE &&
        item.y >= region.yMin - POSITION_TOLERANCE &&
        item.y <= region.yMax + POSITION_TOLERANCE
      ) {
        const cx = (region.xMin + region.xMax) / 2;
        const cy = (region.yMin + region.yMax) / 2;
        const dx = Math.abs(item.x - cx);
        const dy = Math.abs(item.y - cy);
        candidates.push({ item, region, distance: Math.sqrt(dx*dx + dy*dy) });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const result = new Map();
  const usedItems = new Set();
  for (const { item, region } of candidates) {
    if (usedItems.has(item) || result.has(region)) continue;
    result.set(region, item);
    usedItems.add(item);
  }
  return result;
}

// 1. Checkboxes (closest-center assignment)
const checkboxRegions = K1_POSITION_REGIONS.filter(r => r.valueType === 'checkbox');
const cbAssignments = assignItemsToRegions(dataItems, checkboxRegions);
const checkedRegionIds = new Set();
for (const [region, item] of cbAssignments) {
  const isChecked = ['X', '✓', '✗'].includes(item.text.toUpperCase());
  if (!isChecked) continue;
  checkedRegionIds.add(region.fieldId);
  fields.push({
    fieldId: region.fieldId,
    boxNumber: region.boxNumber,
    label: region.label,
    rawValue: 'true',
    numericValue: null,
    fieldCategory: 'CHECKBOX',
    isCheckbox: true,
    subtype: null
  });
  item.matched = true;
  if (region.fieldId === 'FINAL_K1') metadata.isFinal = true;
  if (region.fieldId === 'AMENDED_K1') metadata.isAmended = true;
}
// Emit false for unchecked checkbox regions
for (const region of checkboxRegions) {
  if (checkedRegionIds.has(region.fieldId)) continue;
  fields.push({
    fieldId: region.fieldId,
    boxNumber: region.boxNumber,
    label: region.label,
    rawValue: 'false',
    numericValue: null,
    fieldCategory: 'CHECKBOX',
    isCheckbox: true,
    subtype: null
  });
}

// 2. Part III — subtype regions first, then simple
const partIIIRegions = K1_POSITION_REGIONS.filter(
  r => r.fieldCategory === 'PART_III' && r.valueType !== 'checkbox'
);
const subtypeRegions = partIIIRegions.filter(r => r.hasSubtype);
const simpleRegions = partIIIRegions.filter(r => !r.hasSubtype);

function extractSubtypeField(region) {
  const codes = [];
  const values = [];
  for (const item of dataItems) {
    if (item.matched) continue;
    const inY = item.y >= region.yMin - POSITION_TOLERANCE &&
                item.y <= region.yMax + POSITION_TOLERANCE;
    if (!inY) continue;
    if (region.subtypeXMin !== null && region.subtypeXMax !== null &&
        item.x >= region.subtypeXMin - POSITION_TOLERANCE &&
        item.x <= region.subtypeXMax + POSITION_TOLERANCE) {
      codes.push(item);
    } else if (item.x >= region.xMin - POSITION_TOLERANCE &&
               item.x <= region.xMax + POSITION_TOLERANCE) {
      values.push(item);
    }
  }
  if (codes.length > 0) {
    for (const code of codes) {
      const paired = values.find(v => !v.matched && Math.abs(v.y - code.y) <= SUBTYPE_Y_TOLERANCE);
      const raw = paired ? paired.text : '';
      fields.push({
        fieldId: region.fieldId,
        boxNumber: region.boxNumber,
        label: region.label,
        rawValue: raw,
        numericValue: parseNumericValue(raw),
        fieldCategory: region.fieldCategory,
        isCheckbox: false,
        subtype: code.text.trim()
      });
      code.matched = true;
      if (paired) paired.matched = true;
    }
  } else if (values.length > 0) {
    const item = values[0];
    fields.push({
      fieldId: region.fieldId,
      boxNumber: region.boxNumber,
      label: region.label,
      rawValue: item.text,
      numericValue: parseNumericValue(item.text),
      fieldCategory: region.fieldCategory,
      isCheckbox: false,
      subtype: null
    });
    item.matched = true;
  }
}

for (const region of subtypeRegions) {
  extractSubtypeField(region);
}
for (const region of simpleRegions) {
  const item = findBestItemInRegion(dataItems, region);
  if (!item) continue;
  fields.push({
    fieldId: region.fieldId,
    boxNumber: region.boxNumber,
    label: region.label,
    rawValue: item.text,
    numericValue: parseNumericValue(item.text),
    fieldCategory: region.fieldCategory,
    isCheckbox: false,
    subtype: null
  });
  item.matched = true;
}

// 3. Metadata — tax year (lowered threshold from 745 to 710)
const taxYearItems = [];
for (const item of dataItems) {
  if (item.matched) continue;
  if (item.y > 710 && item.x > 200 && item.x < 350) {
    if (/^\d{2,4}$/.test(item.text)) {
      taxYearItems.push(item);
    }
  }
}
if (taxYearItems.length >= 2) {
  taxYearItems.sort((a, b) => a.x - b.x);
  const combined = taxYearItems.map(i => i.text).join('');
  const year = parseInt(combined, 10);
  if (year >= 1900 && year <= 2100) {
    metadata.taxYear = year;
    for (const item of taxYearItems) item.matched = true;
  }
}

// Text metadata
function extractTextMetadata(regionFieldId, metadataKey) {
  const region = K1_POSITION_REGIONS.find(r => r.fieldId === regionFieldId);
  if (!region) return;
  const matches = [];
  for (const item of dataItems) {
    if (item.matched) continue;
    if (
      item.x >= region.xMin - POSITION_TOLERANCE &&
      item.x <= region.xMax + POSITION_TOLERANCE &&
      item.y >= region.yMin - POSITION_TOLERANCE &&
      item.y <= region.yMax + POSITION_TOLERANCE
    ) {
      matches.push(item);
    }
  }
  if (matches.length === 0) return;
  matches.sort((a, b) => b.y - a.y);
  const combined = matches.map(m => m.text).join(' ').trim();
  if (metadataKey && combined) {
    metadata[metadataKey] = combined;
  }
  for (const item of matches) item.matched = true;
}

extractTextMetadata('A_EIN', 'partnershipEin');
extractTextMetadata('B_NAME', 'partnershipName');
extractTextMetadata('C_IRS_CENTER', null);
extractTextMetadata('E_TIN', 'partnerEin');
extractTextMetadata('F_NAME_ADDR', 'partnerName');

// Remaining metadata regions
const metadataRegions = K1_POSITION_REGIONS.filter(
  r => r.fieldCategory === 'METADATA' && r.valueType === 'text'
);
for (const region of metadataRegions) {
  const item = findBestItemInRegion(dataItems, region);
  if (!item) continue;
  fields.push({
    fieldId: region.fieldId,
    boxNumber: region.boxNumber,
    label: region.label,
    rawValue: item.text,
    numericValue: parseNumericValue(item.text),
    fieldCategory: region.fieldCategory,
    isCheckbox: false,
    subtype: null
  });
  item.matched = true;
}

// 4. Sections J/K/L/M/N (closest-center assignment)
for (const cat of ['SECTION_J', 'SECTION_K', 'SECTION_L', 'SECTION_M', 'SECTION_N']) {
  const regions = K1_POSITION_REGIONS.filter(r => r.fieldCategory === cat && r.valueType !== 'checkbox');
  const assignments = assignItemsToRegions(dataItems, regions);
  for (const [region, item] of assignments) {
    fields.push({
      fieldId: region.fieldId,
      boxNumber: region.boxNumber,
      label: region.label,
      rawValue: item.text,
      numericValue: parseNumericValue(item.text),
      fieldCategory: region.fieldCategory,
      isCheckbox: false,
      subtype: null
    });
    item.matched = true;
  }
}

// ── Print results ──
console.log('=== METADATA ===');
console.log(JSON.stringify(metadata, null, 2));

console.log('\n=== EXTRACTED FIELDS ===');
// Group by category
const byCategory = {};
for (const f of fields) {
  const cat = f.fieldCategory;
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(f);
}

for (const [cat, catFields] of Object.entries(byCategory)) {
  console.log(`\n--- ${cat} ---`);
  for (const f of catFields) {
    const sub = f.subtype ? ` [${f.subtype}]` : '';
    const num = f.numericValue !== null ? ` (=${f.numericValue})` : '';
    console.log(`  ${f.fieldId || f.boxNumber}: "${f.rawValue}"${sub}${num}`);
  }
}

// Unmapped
const unmapped = dataItems.filter(i => !i.matched && (i.text.length > 1 || /\d/.test(i.text) || i.text === 'X'));
console.log(`\n=== UNMAPPED ITEMS (${unmapped.length}) ===`);
for (const u of unmapped) {
  const x = Math.round(u.x * 10) / 10;
  const y = Math.round(u.y * 10) / 10;
  console.log(`  "${u.text}" at (${x}, ${y}) font=${u.fontFamily}`);
}

await pdfDoc.destroy();
console.log('\nDone.');
