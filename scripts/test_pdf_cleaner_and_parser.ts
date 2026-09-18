import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export function cleanRawPdfArtifacts(text: string): string {
  if (!text) return '';
  if (!text.includes('%PDF-') && !text.includes('endobj') && !text.includes(' 0 obj') && !text.includes('ReportLab')) {
    return text;
  }

  // Extract embedded text operators: (some text) Tj
  const textMatches: string[] = [];
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match;
  while ((match = tjRegex.exec(text)) !== null) {
    const val = match[1].replace(/\\([()\\])/g, '$1').trim();
    if (val.length > 1 && !val.startsWith('/') && !val.startsWith('http')) {
      textMatches.push(val);
    }
  }

  // Extract links: /URI (http...)
  const uriRegex = /\/URI\s*\(([^)]+)\)/g;
  let uriMatch;
  while ((uriMatch = uriRegex.exec(text)) !== null) {
    textMatches.push(`Link: ${uriMatch[1]}`);
  }

  if (textMatches.length > 0) {
    return textMatches.join('\n');
  }

  // Strip raw PDF tags
  const cleaned = text
    .replace(/%PDF-[\d.]+/gi, '')
    .replace(/%[^\n\r]+/g, '')
    .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/gi, '')
    .replace(/<<[\s\S]*?>>/g, '')
    .replace(/xref[\s\S]*?trailer/gi, '')
    .replace(/startxref[\s\S]*?%%EOF/gi, '')
    .replace(/stream[\s\S]*?endstream/gi, '')
    .trim();

  return cleaned;
}

async function run() {
  console.log('=== TESTING PDF CLEANER AND PARSER ===');

  // Test 1: Cleaner on screenshot snippet
  const screenshotSnippet = `
%PDF-1.4
% ReportLab Generated PDF document (opensource)
1 0 obj
<<
/F1 2 0 R /F2 3 0 R
>>
endobj
2 0 obj
<<
/BaseFont /Helvetica /Encoding /WinAnsiEncoding /Name /F1 /Subtype /Type1 /Type /Font
>>
endobj
3 0 obj
<<
/BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding /Name /F2 /Subtype /Type1 /Type /Font
>>
endobj
4 0 obj
<<
/A <<
/S /URI /Type /Action /URI (https://hmyat3366-ai.github.io/anizwizgouki/)
>> /Border [ 0 0 0 ] /Rect [ 88.498 610.2 158.527 621 ] /Subtype /Link /Type /Annot
>>
`;

  const cleaned = cleanRawPdfArtifacts(screenshotSnippet);
  console.log('✅ 1. Cleaned screenshot snippet:');
  console.log(JSON.stringify(cleaned));
  if (cleaned.includes('%PDF-1.4') || cleaned.includes('1 0 obj') || cleaned.includes('/BaseFont')) {
    throw new Error('cleanRawPdfArtifacts failed to strip raw PDF markers!');
  }

  // Test 2: Parse real user PDF file
  const userPdfPath = 'C:\\Users\\User\\Downloads\\Write Tes AnizwizGouki ( Htet Myat Oo ).pdf';
  if (fs.existsSync(userPdfPath)) {
    const rawBuf = fs.readFileSync(userPdfPath);
    console.log(`✅ 2. Found user PDF (${rawBuf.length} bytes). Magic bytes:`, rawBuf.slice(0, 5).toString());
    const parser = new PDFParse({ data: rawBuf });
    const parsed = await parser.getText();
    await parser.destroy().catch(() => {});
    console.log(`   Extracted length: ${parsed?.text?.length} chars.`);
    console.log('   Sample:', JSON.stringify(parsed?.text?.slice(0, 100)));
    if (!parsed?.text?.includes('Gouki')) {
      throw new Error('Failed to extract Gouki from user PDF!');
    }
  }

  console.log('=== ALL TESTS PASSED! ===');
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
