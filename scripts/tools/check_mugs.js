const fs = require('fs');
const path = require('path');

const catPath = path.join(__dirname, '../../src/config/catalog_master_v2.json');
const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));

const mugs = catalog.filter(p => {
  const cat = (p.categoria || '').toUpperCase();
  const nom = (p.nombre || '').toUpperCase();
  const desc = (p.descripcion || '').toUpperCase();
  return cat.includes('MUG') || nom.includes('MUG') || desc.includes('MUG') || cat.includes('TAZA') || nom.includes('TAZA') || cat.includes('TERMO') || nom.includes('TERMO');
});

console.log(`Total Mugs / Tazas / Termos encontrados: ${mugs.length}`);

// Group by category and capacity/name
const categories = {};
mugs.forEach(m => {
  const c = m.categoria || 'SIN_CATEGORIA';
  if (!categories[c]) categories[c] = [];
  categories[c].push(m);
});

console.log('\n--- CATEGORÍAS ENCONTRADAS ---');
Object.keys(categories).forEach(c => {
  console.log(`- ${c}: ${categories[c].length} productos`);
});

console.log('\n--- MUESTRA DE MUGS TÉRMICOS DE ACERO ---');
const mugsTermicos = mugs.filter(p => {
  const desc = ((p.nombre || '') + ' ' + (p.descripcion || '') + ' ' + (p.categoria || '')).toUpperCase();
  return desc.includes('ACERO') || desc.includes('TÉRMICO') || desc.includes('TERMICO') || desc.includes('MUG');
});

console.log(`Total Mugs Térmicos de Acero: ${mugsTermicos.length}`);

const uniqueModels = {};
mugsTermicos.forEach(m => {
  const name = m.nombre;
  if (!uniqueModels[name]) {
    uniqueModels[name] = {
      sku: m.sku,
      nombre: m.nombre,
      categoria: m.categoria,
      foto_url: m.foto_url,
      precio_1u: m.precio_1u,
      precio_100u: m.precio_100u,
      descripcion: m.descripcion ? m.descripcion.substring(0, 120) : '',
      variantes: []
    };
  }
  uniqueModels[name].variantes.push({ sku: m.sku, color: m.variante_color, stock: m.stock });
});

console.log('\n--- MODELOS ÚNICOS DE MUGS TÉRMICOS DE ACERO ---');
console.log(JSON.stringify(Object.values(uniqueModels).slice(0, 20), null, 2));
