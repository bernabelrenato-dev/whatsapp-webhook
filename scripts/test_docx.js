const mammoth = require('mammoth');
const path = require('path');

async function test() {
  const filePath = 'C:\\Users\\USER\\Downloads\\LISTAS\\COMPANY.docx';
  const result = await mammoth.extractRawText({ path: filePath });
  console.log('keys of result:', Object.keys(result));
  console.log('value length:', result.value.length);
  if (result.messages) {
    console.log('messages:', result.messages);
  }
}
test().catch(console.error);
