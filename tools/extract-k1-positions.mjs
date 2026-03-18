/**
 * Utility to extract all text items with their (x, y) positions from a K-1 PDF.
 * This dumps every text item with coordinates so we can calibrate position regions.
 *
 * Usage: node tools/extract-k1-positions.mjs <path-to-pdf>
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Dynamic import of pdfjs-dist legacy build
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

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error('Usage: node tools/extract-k1-positions.mjs <path-to-pdf>');
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
console.log(`Pages: ${pdfDoc.numPages}`);

for (let pageNum = 1; pageNum <= Math.min(pdfDoc.numPages, 2); pageNum++) {
  console.log(`\n=== PAGE ${pageNum} ===\n`);
  const page = await pdfDoc.getPage(pageNum);
  const textContent = await page.getTextContent({ includeMarkedContent: false });

  const items = textContent.items;
  const styles = textContent.styles;

  // Sort by y descending (top of page first), then x ascending
  const sorted = [...items].sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    if (Math.abs(dy) > 2) return dy;
    return a.transform[4] - b.transform[4];
  });

  for (const item of sorted) {
    const text = item.str.trim();
    if (!text) continue;

    const x = Math.round(item.transform[4] * 10) / 10;
    const y = Math.round(item.transform[5] * 10) / 10;
    const style = styles[item.fontName] || {};
    const fontFamily = style.fontFamily || 'unknown';
    const isData = fontFamily.toLowerCase() !== 'serif';

    console.log(
      `${isData ? 'DATA' : 'TMPL'} | x=${String(x).padStart(7)} | y=${String(y).padStart(7)} | font=${fontFamily.padEnd(15)} | "${text}"`
    );
  }
}

await pdfDoc.destroy();
console.log('\nDone.');
