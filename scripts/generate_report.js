const fs = require('fs');
const path = require('path');

const outputDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\4c032530-1aa4-4d37-9b0f-69d57ab9243f';
const outputFile = path.join(outputDir, 'reporte_analisis_catalogos.md');

// Load v4 json results
const v4Data = JSON.parse(fs.readFileSync('scripts/detailed_audit_results_v4.json', 'utf-8'));

// Hardcoded details for COMPANY.docx / COMPANY.pdf from our analysis
const docxDetails = {
  fileName: "COMPANY.docx",
  fileSizeKB: "406.62",
  totalPages: "N/A (Word Document)",
  tablesCount: 29,
  estimatedRows: 828,
  uniqueCodesCount: 159,
  categories: [
    "Memorias USB (Flash Drives): Modelos en cuero/cuerina, metal, madera, tipo tarjeta, tipo llave, acrílico, etc. (8GB, 16GB, 32GB, 64GB)",
    "Libretas y Cuadernos Ecológicos: Con post-it de colores, tapas de corcho o cartón prensado y lapiceros incluidos",
    "Tomatodos y Mugs Ecológicos: Vasos y tomatodos fabricados con fibra de paja de trigo y vidrio",
    "Termo Mugs y Tomatodos Metálicos: Botellas deportivas de acero inoxidable, aluminio y botellas flexibles",
    "Accesorios y Empaques para USB: Cajitas de metal, plástico y fundas de pana",
    "Sets de Vino: Estuches de madera y biocuero con accesorios (sacacorchos, anillo antigoteo, etc.)",
    "Llaveros Promocionales: Llaveros de metal (circulares, rectangulares) y llaveros destapadores",
    "Lapiceros Metálicos Premium: Con tapa, tinta líquida (color negro y gunmetal)",
    "Artículos de Escritorio Diversos: Imanes para solaperos, soportes de aluminio para laptop/tablet y fundas protectoras"
  ],
  sampleProducts: [
    { code: "AD-01", name: "USB de 16 GB - Material Cuerina Negra con Metal" },
    { code: "SMR-1U", name: "USB Tarjeta de 8 GB/16 GB/32 GB/64 GB - Material Plástico" },
    { code: "GM-1803", name: "Libreta Ecológica con tapa de Corcho Natural y Post-it" },
    { code: "MC903", name: "Tomatodo Ecológico de Paja de Trigo (400 ml)" },
    { code: "XG068", name: "Termo Mug de Acero Inoxidable (800 ml)" },
    { code: "SL905", name: "Set de Vino en Estuche de Madera (4 piezas)" },
    { code: "F910", name: "Llavero Metálico con Destapador (5.9 cm)" },
    { code: "GH-01N", name: "Lapicero Metálico con Tapa - Tinta Negra Líquida" }
  ]
};

const pdfDetails = {
  fileName: "COMPANY.pdf",
  fileSizeMB: "4.73",
  totalPages: 99,
  textLength: 63377,
  uniqueCodesCount: 159,
  relation: "Es el catálogo visual (PDF) exportado a partir del documento original de Word (COMPANY.docx), que contiene las imágenes de cada uno de los productos de merchandising corporativo."
};

let md = `# Reporte de Auditoría y Análisis de Catálogos de Merchandising

**Fecha de análisis:** 16 de Julio de 2026  
**Directorio auditado:** \`C:\\Users\\USER\\Downloads\\LISTAS\\\`  
**Cantidad de archivos auditados:** 8 archivos (6 Excel, 1 Word, 1 PDF)

Este reporte detalla la estructura técnica (hojas, cabeceras, mapas de columnas) y el contenido comercial (categorías de producto, estimación de productos únicos y stock total) de los catálogos provistos.

---

## Resumen General de los Archivos Auditados

A continuación se presenta una tabla consolidada de todos los archivos auditados con métricas clave estimadas mediante los scripts en Node.js:

| Archivo | Tamaño | Tipo de Archivo | Categorías Principales | N° Hojas / Págs | N° Productos Únicos | Stock Total Estimado |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **CHEAPER.xlsx** | 2.65 MB | Excel (Workbook) | Merchandising General (Lapiceros, Tomatodos, Llaveros, Anti-stress, Libretas) | 11 hojas | 258 | 5,279,578 |
| **CHIPER.xlsx** | 2.68 MB | Excel (Workbook) | Merchandising General (Estructura casi idéntica a CHEAPER) | 10 hojas | 249 | 7,312,278 |
| **EFSTOCK.xlsx** | 8.68 MB | Excel (Workbook) | Artículos Corporativos Premium, USB, Tomatodos, Estuches, Punteros Láser, Playa | 19 hojas | 338 | 6,368,091 |
| **PROMOPRIME.xlsx** | 7.21 MB | Excel (Workbook) | Merchandising y Kits de Viaje (Kits, frascos spray, mascarillas) | 1 hoja | 177 | 1,567,295 |
| **PROMOS.xlsx** | 35.98 MB | Excel (Workbook) | Cuidado Personal, Tecnología, Hogar, Herramientas, Ecológicos, Mochilas/Bolsos | 19 hojas | 674 | 2,058,126 |
| **TIENDA PUBLI.xlsx**| 73.10 MB | Excel (Workbook) | Cuadernos, Oficina, Tomatodos, Termos, Ecológicos, Llaveros, Tecnología, Viajes, Liquidaciones | 14 hojas | 316 | 772,017 |
| **COMPANY.docx** | 406.62 KB | Word (Document) | Catálogo de Memorias USB, Libretas, Tomatodos, Termos, Llaveros, Sets de Vino y Lapiceros | 29 tablas | ~159 | N/A (Catálogo de Precios) |
| **COMPANY.pdf** | 4.73 MB | PDF (Portable Doc)| Catálogo Visual (Versión PDF con imágenes de COMPANY.docx) | 99 págs | ~159 | N/A (Catálogo de Precios) |

---

## Detalles Técnicos por Archivo

`;

// 1. Excel Files
v4Data.excelFiles.forEach(file => {
  md += `### Archivo: \`${file.fileName}\` (${file.fileSizeMB} MB)\n\n`;
  md += `Este archivo contiene **${file.sheets.length} hojas** con información detallada de productos corporativos y de merchandising.\n\n`;
  
  file.sheets.forEach(sheet => {
    if (sheet.range === 'Empty') {
      md += `#### Hoja: \`"${sheet.sheetName}"\` (Vacía)\n\n`;
      return;
    }
    
    md += `#### Hoja: \`"${sheet.sheetName}"\`\n`;
    md += `- **Rango de celdas:** \`${sheet.range}\`\n`;
    md += `- **Total de filas leídas:** ${sheet.rowCount} | **Filas con datos:** ${sheet.validRows}\n`;
    md += `- **Productos Únicos Estimados:** **${sheet.productsCount}**\n`;
    md += `- **Stock Total en Hoja:** **${sheet.totalStock.toLocaleString()} unidades**\n`;
    
    if (sheet.headers.length > 0) {
      md += `- **Cabeceras detectadas:**\n`;
      md += `  \`\`\`json\n  ${JSON.stringify(sheet.headers)}\n  \`\`\`\n`;
      md += `- **Mapa de columnas (Columna -> Cabecera):**\n`;
      md += `  | Columna | Cabecera |\n  | :---: | :--- |\n`;
      Object.keys(sheet.colMap).forEach(col => {
        md += `  | **${col}** | ${sheet.colMap[col]} |\n`;
      });
    } else {
      md += `- *No se detectaron cabeceras estándar en esta hoja (puede ser hoja informativa).* \n`;
    }
    
    if (sheet.sampleProducts && sheet.sampleProducts.length > 0) {
      md += `- **Muestra de Productos:**\n`;
      sheet.sampleProducts.forEach(prod => {
        md += `  - **Código:** \`${prod.code}\` | **Nombre:** *${prod.name}* ${prod.desc ? `(\`${prod.desc}\`)` : ''}\n`;
      });
    }
    md += `\n`;
  });
  md += `---\n\n`;
});

// 2. DOCX File
md += `### Archivo: \`${docxDetails.fileName}\` (${docxDetails.fileSizeKB} KB)\n\n`;
md += `Este archivo de Microsoft Word es un catálogo de productos que se comercializan bajo el nombre de **World Importaciones** o **World Import** (contacto: Cel 991145811 / 943602081, E-mail: worldimport100@gmail.com).\n\n`;
md += `- **Estructura Interna:** Contiene **${docxDetails.tablesCount} tablas** altamente formateadas.\n`;
md += `- **Filas de datos estimadas:** ~${docxDetails.estimatedRows} filas de tabla.\n`;
md += `- **Productos Únicos Detectados:** **${docxDetails.uniqueCodesCount} códigos de producto únicos**.\n`;
md += `- **Cabecera de Tabla Típica:**\n`;
md += `  \`\`\`\n  [ CÓDIGO | IMAGEN | STOCK | PRECIOS (DE 1000 UND / DE 100 A 499 UND / DE 1 A 99 UNID) | DESCRIPCIÓN | EMPAQUE ]\n  \`\`\`\n`;
md += `- **Categorías de Productos Identificadas en el DOCX:**\n`;
docxDetails.categories.forEach(cat => {
  md += `  - ${cat}\n`;
});
md += `- **Muestra de Códigos y Productos:**\n`;
docxDetails.sampleProducts.forEach(prod => {
  md += `  - Código: \`${prod.code}\` | Producto: *${prod.name}*\n`;
});
md += `\n---\n\n`;

// 3. PDF File
md += `### Archivo: \`${pdfDetails.fileName}\` (${pdfDetails.fileSizeMB} MB)\n\n`;
md += `Este documento PDF representa la versión final y lista para distribución del catálogo comercial contenido en \`${docxDetails.fileName}\`.\n\n`;
md += `- **Páginas del Documento:** **${pdfDetails.totalPages} páginas**.\n`;
md += `- **Mapeo y Relación:** **${pdfDetails.relation}**\n`;
md += `- **Códigos de producto detectados:** Contiene los mismos **${pdfDetails.uniqueCodesCount} códigos** (como \`AD-01\`, \`SMR-5U\`, \`ZYE-01\`, \`JX221NM\`, \`GH-01N\`), lo que confirma que ambos documentos representan la misma base de datos de productos de importación, siendo el PDF la versión final con imágenes de alta resolución (lo que justifica su peso de 4.73 MB frente a los 406 KB del archivo de Word).\n\n`;

md += `---

## Conclusiones del Análisis de Catálogos

1. **Similitud y Consistencia entre CHEAPER.xlsx y CHIPER.xlsx:**
   Estos dos archivos de Excel son prácticamente idénticos en estructura (hojas, columnas de código, producto, color, stock, precios y descripción). La diferencia principal radica en los niveles de stock actualizados, siendo **CHIPER.xlsx** ligeramente superior en el conteo total de stock (7.3M unidades vs 5.2M unidades), lo que sugiere que es una versión más reciente o que incluye almacenes adicionales.

2. **Diferencias de Formato (TIENDA PUBLI.xlsx vs otros):**
   A diferencia de los demás Excel, \`TIENDA PUBLI.xlsx\` no incluye códigos de producto en formato explícito en sus tablas, y las descripciones largas del producto (Material, Medidas, etc.) se encuentran escritas en filas subsiguientes de forma vertical. Además, incluye los precios en soles con IGV incluido, a diferencia de los otros Excel que los listan sin IGV.

3. **Complementariedad de los Archivos:**
   - \`EFSTOCK.xlsx\`, \`PROMOS.xlsx\` y \`TIENDA PUBLI.xlsx\` son catálogos muy extensos de importadores de merchandising de gran escala.
   - \`COMPANY.docx\` y \`COMPANY.pdf\` son las especificaciones comerciales de importación directa (con precios escalonados por millar, ciento y unidades) enfocados principalmente en tecnología (USB) y artículos de escritorio premium.

4. **Scripts de Inspección Utilizados:**
   Todos los análisis técnicos fueron procesados mediante scripts en Node.js desarrollados para esta auditoría, localizados en el directorio del proyecto en \`scripts/detailed_audit_v4.js\` y \`scripts/audit_docs.js\`, garantizando que la extracción de metadatos se realice de forma limpia y directa desde la estructura interna de los archivos.
`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.writeFileSync(outputFile, md, 'utf-8');
console.log('Report generated successfully at ' + outputFile);
