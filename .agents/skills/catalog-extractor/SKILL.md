# Skill: Catalog Data Ingestion & Visual Product Search

Habilidad especializada para la extracción, limpieza, estructuración y sincronización de catálogos de merchandising (desde Excel, Word, PDF o Web) hacia una base de datos centralizada (Postgres/Sheets), y la posterior búsqueda visual de productos por foto.

---

## 1. Arquitectura de Ingesta y Extracción

Para poblar y estructurar la base de datos de productos (en Google Sheets o Postgres), se definen los siguientes pipelines de extracción:

### A. Extracción de Excel (`.xlsx`, `.xls`, `.csv`)
Utilizar `xlsx` (SheetJS) o `exceljs` para leer hojas complejas con escalas de precios y descripciones:
```javascript
const XLSX = require('xlsx');

function parseExcelCatalog(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

  return rawData.map(row => ({
    code: row['Código'] || row['Code'] || row['CODIGO'],
    name: row['Nombre'] || row['Name'] || row['PRODUCTO'],
    description: row['Descripción'] || row['Description'] || '',
    color: row['Color'] || 'MULTICOLOR',
    stock: parseInt(row['Stock'] || 0, 10),
    price_500: parseFloat(row['Precio 500+'] || row['500 und'] || null),
    price_50: parseFloat(row['Precio 50+'] || row['50 und'] || null),
    price_1: parseFloat(row['Precio 1+'] || row['1 und'] || null),
    category: row['Categoría'] || 'General',
    image: row['Imagen'] || `${row['Código']}.jpg`
  }));
}
```

### B. Extracción de Word (`.docx`)
Usar `mammoth` para convertir las tablas de especificaciones en HTML y luego parsearlas usando `cheerio`:
```javascript
const mammoth = require('mammoth');
const cheerio = require('cheerio');

async function parseWordCatalog(filePath) {
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
  const $ = cheerio.load(html);
  const products = [];

  $('table').each((_, table) => {
    // Extraer filas y convertirlas en llaves-valores del producto
  });
  return products;
}
```

### C. Extracción de PDF
Utilizar `pdf-parse` o `pdf2json` para extraer cadenas de texto y estructurarlas mediante expresiones regulares, buscando patrones como `[A-Z]{2,4}-\d{2,4}` para códigos de productos.

### D. Extracción de Web (Scraping)
Utilizar `axios` + `cheerio` para extraer de portales web:
```javascript
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeProviderCatalog(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const items = [];

  $('.product-card').each((_, el) => {
    items.push({
      code: $(el).find('.sku').text().trim(),
      name: $(el).find('.title').text().trim(),
      price: parseFloat($(el).find('.price').text().replace(/[^0-9.]/g, ''))
    });
  });
  return items;
}
```

---

## 2. Estructuración en Google Sheets

Para conectar Google Sheets como tu base de datos principal, puedes inicializar `googleapis` y sincronizar los registros mediante la API de Google Drive/Sheets.

### Conexión del Google Sheets API
1. Habilita Google Sheets API en tu Google Cloud Console.
2. Descarga tus credenciales de cuenta de servicio (`credentials.json`).
3. Comparte tu hoja de cálculo de Google (Spreadsheet ID) con el correo electrónico de la cuenta de servicio.

```javascript
const { google } = require('googleapis');

async function syncCatalogToGoogleSheets(products, spreadsheetId) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  // Mapear productos a formato matriz [[]]
  const rows = products.map(p => [
    p.code, p.name, p.description, p.color, p.stock, p.price_500, p.price_50, p.price_1, p.category, p.image
  ]);

  // Insertar/Actualizar filas en Sheets
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A2',
    valueInputOption: 'RAW',
    resource: { values: rows },
  });
}
```

---

## 3. Reconocimiento Visual (Multimodal Image-to-Product)

Para que el cliente mande una foto por WhatsApp y el bot encuentre el producto:

### Flujo de Trabajo
1. El webhook recibe un mensaje tipo `image` con su `image.id`.
2. Se descarga la imagen de los servidores de Meta usando su API Graph de contenido multimedia:
   `GET https://graph.facebook.com/v25.0/<MEDIA_ID>` (utilizando el Access Token en la cabecera).
3. Se envía el buffer de la imagen junto con una versión resumida del catálogo de productos (ej. códigos, nombres y descripción visual) a la API de **Gemini 1.5/2.0 Pro/Flash**:

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function identifyProductFromImage(imageBuffer, mimeType, catalog) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Convertir buffer a formato inlineData para Gemini
  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType
    },
  };

  const catalogContext = JSON.stringify(catalog.map(p => ({
    code: p.code,
    name: p.name,
    category: p.category,
    description: p.description
  })));

  const prompt = `
    Analiza detalladamente la foto del producto publicitario/merchandising adjunta.
    
    A continuación, compara sus características visuales (forma, material, color, tapas, costuras, etc.) contra este catálogo oficial de productos en formato JSON:
    ${catalogContext}
    
    Determina si la imagen corresponde a alguno de los productos listados.
    
    Responde estrictamente en formato JSON válido con esta estructura:
    {
      "matched": true/false,
      "code": "CÓDIGO_DEL_PRODUCTO_COINCIDENTE_O_VACÍO",
      "reason": "Explicación breve de por qué coincide o por qué no"
    }
  `;

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text().trim();
  
  // Limpiar posibles bloques de código de markdown ```json
  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}
```

4. El servidor Node.js toma el código del producto que Gemini detectó (ej. `MUG-25`) e inyecta directamente la búsqueda en la sesión de WhatsApp, continuando la conversación como si el usuario hubiera escrito el nombre del producto de forma textual.
