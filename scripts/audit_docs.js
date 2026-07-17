const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

const dirPath = 'C:\\Users\\USER\\Downloads\\LISTAS';
let output = '';

function log(msg, ...args) {
  const line = msg + ' ' + args.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' ');
  console.log(line);
  output += line + '\n';
}

async function auditDocx(fileName) {
  const filePath = path.join(dirPath, fileName);
  log(`\n==================================================`);
  log(`Auditing DOCX: ${fileName}`);
  const stats = fs.statSync(filePath);
  log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);

  // Extract raw text
  const resultText = await mammoth.extractRawText({ path: filePath });
  const text = resultText.value;
  const messages = resultText.messages;
  log(`Text length: ${text.length} characters`);
  log(`Messages: ${messages.length}`);

  // Extract HTML to see if there are tables
  const resultHtml = await mammoth.convertToHtml({ path: filePath });
  const html = resultHtml.value;
  log(`HTML length: ${html.length} characters`);

  // Count tables
  const tableMatches = html.match(/<table/g) || [];
  log(`Number of tables in DOCX: ${tableMatches.length}`);

  // Sample text (first 1500 characters)
  log(`--- Raw Text Sample (first 1500 chars) ---`);
  log(text.slice(0, 1500));

  // If there are tables, show the first table's text/html structure
  if (tableMatches.length > 0) {
    log(`--- Table HTML Sample (first 1500 chars) ---`);
    log(html.slice(html.indexOf('<table'), html.indexOf('<table') + 1500));
  }
}

async function auditPdf(fileName) {
  const filePath = path.join(dirPath, fileName);
  log(`\n==================================================`);
  log(`Auditing PDF: ${fileName}`);
  const stats = fs.statSync(filePath);
  log(`Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  const infoResult = await parser.getInfo({ parsePageInfo: true });
  await parser.destroy();

  log(`Number of pages: ${infoResult.total}`);
  log(`Text length: ${result.text.length} characters`);
  log(`Metadata:`, infoResult.info);

  // Sample text (first 1500 characters)
  log(`--- PDF Text Sample (first 1500 chars) ---`);
  log(result.text.slice(0, 1500));

  // Split into lines
  const lines = result.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  log(`Total non-empty lines: ${lines.length}`);
  log(`--- Sample Lines (first 15) ---`);
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    log(`  Line ${i}: ${lines[i]}`);
  }
}

async function run() {
  try {
    await auditDocx('COMPANY.docx');
  } catch (err) {
    log(`Error auditing COMPANY.docx: ${err.message}`);
  }

  try {
    await auditPdf('COMPANY.pdf');
  } catch (err) {
    log(`Error auditing COMPANY.pdf: ${err.message}`);
  }

  fs.writeFileSync('scripts/audit_docs_output_utf8.txt', output, 'utf-8');
  log(`\nWritten output to scripts/audit_docs_output_utf8.txt`);
}

run();
