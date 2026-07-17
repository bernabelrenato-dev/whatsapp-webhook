// Script para generar un mapa del proyecto ligero y optimizado para el ahorro de tokens (TEP)
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', '..');

// Lista de archivos clave y su propósito en 1 línea
const fileIndex = {
  'src/server.js': 'Punto de entrada del servidor Webhook de WhatsApp (Puerto 3000).',
  'src/app.js': 'Configuración de Express, middlewares de firma HMAC y rutas globales.',
  'src/routes/api.routes.js': 'Definición de rutas públicas y endpoints de webhook.',
  'src/controllers/api.controller.js': 'Controladores para peticiones de webhook y consultas del catálogo.',
  'src/services/message.service.js': 'Servicio núcleo de WhatsApp: descarga multimedia de Meta, procesa imágenes y texto, y rutea flujos.',
  'src/services/gemini.service.js': 'Servicio de integración de Gemini AI: búsqueda visual por similitud de productos y FAQ conversacionales.',
  'src/services/catalog.service.js': 'Servicio del catálogo de productos: búsqueda de stock, cálculo de escalas de precios y cotizaciones.',
  'src/utils/logger.js': 'Configuración del registrador de logs estructurado del sistema.',
  'scripts/tests/': 'Carpeta con simulaciones de flujos de chat E2E y scripts de validación de base de datos.',
  'scripts/database/': 'Carpeta con parches SQL y JS de migración y alineación de Typebot.',
  'scripts/tools/': 'Herramientas de compilación de catálogo, túneles locales y generador de mapa de proyecto.',
  '.agents/': 'Carpeta de personalizaciones: habilidades (skills) y configuraciones de subagentes especializados.'
};

function getDirectoryTree(dir, prefix = '') {
  let results = '';
  const list = fs.readdirSync(dir);
  
  // Ordenar directorios primero, luego archivos
  const sortedList = list.filter(f => {
    if (f === 'node_modules' || f === '.git' || f === 'project-context.md' || f === 'package-lock.json') return false;
    return true;
  }).sort((a, b) => {
    const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
    const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  sortedList.forEach((file, index) => {
    const filePath = path.join(dir, file);
    const isLast = index === sortedList.length - 1;
    const isDir = fs.statSync(filePath).isDirectory();
    
    results += `${prefix}${isLast ? '└── ' : '├── '}${file}${isDir ? '/' : ''}\n`;
    
    if (isDir) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      // No profundizar de forma infinita en node_modules, .git ni en imágenes de catálogo
      if (file !== 'node_modules' && file !== '.git' && file !== 'images' && file !== 'public') {
        results += getDirectoryTree(filePath, newPrefix);
      } else if (file === 'public') {
        results += `${newPrefix}└── images/ (Contiene imágenes del catálogo - excluidas para ahorro de tokens)\n`;
      }
    }
  });
  return results;
}

function generateMap() {
  console.log('🗺️ Generando mapa del proyecto ligero...');
  const tree = getDirectoryTree(rootDir);
  
  let indexTable = '| Directorio / Archivo | Responsabilidad / Descripción (Cargar bajo demanda con view_file) |\n';
  indexTable += '| :--- | :--- |\n';
  for (const [file, desc] of Object.entries(fileIndex)) {
    indexTable += `| [${file}](file:///${path.join(rootDir, file).replace(/\\/g, '/')}) | ${desc} |\n`;
  }

  const markdownContent = `# 🗺️ Mapa de Contexto del Proyecto (Protocolo TEP)

Este archivo reemplaza el empaquetado de código completo para optimizar y reducir el uso de tokens. 
Para analizar o modificar un archivo, consúltelo en este índice y cárguelo bajo demanda utilizando la herramienta de visualización de archivos.

## 🌳 Estructura de Directorios
\`\`\`text
${tree}\`\`\`

## 📂 Índice de Archivos Clave (Lazy Loading)
${indexTable}
`;

  const outputPath = path.join(rootDir, 'project-context.md');
  fs.writeFileSync(outputPath, markdownContent);
  console.log(`✅ Mapa escrito con éxito en: ${outputPath}`);
}

generateMap();
