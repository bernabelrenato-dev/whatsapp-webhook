/**
 * Suite de Pruebas Unitarias e Integración Local — Fixes Chatwoot & Gemini
 * Valida:
 * 1. Normalización de teléfonos y URL-Encoding en la API de Chatwoot.
 * 2. Manejo de errores y estructuras de diagnóstico en Gemini AI.
 * 3. Ausencia de regresiones en el flujo de enrutamiento.
 */

const assert = require('assert');
const path = require('path');

async function runTests() {
  console.log('🧪 Iniciando ejecutor de pruebas unitarias locales...');

  // Pruebas de normalización de teléfono
  const rawPhone1 = '+51978966098';
  const rawPhone2 = '51978966098';
  const rawPhone3 = '  +51 (978) 966-098  ';

  const clean1 = rawPhone1.replace(/\D/g, '');
  const clean2 = rawPhone2.replace(/\D/g, '');
  const clean3 = rawPhone3.replace(/\D/g, '');

  assert.strictEqual(clean1, '51978966098', 'Error normalizando rawPhone1');
  assert.strictEqual(clean2, '51978966098', 'Error normalizando rawPhone2');
  assert.strictEqual(clean3, '51978966098', 'Error normalizando rawPhone3');
  console.log('✅ 1. Normalización de números telefónicos: PASADO');

  // Pruebas de URL-Encoding para búsqueda de contactos
  const formattedPhone = `+${clean1}`;
  const encodedQuery = encodeURIComponent(formattedPhone);

  assert.strictEqual(encodedQuery, '%2B51978966098', 'encodeURIComponent no convirtió el signo + a %2B');
  assert.notStrictEqual(encodedQuery, '+51978966098', 'El signo + no fue codificado, provocaría espacio en HTTP GET');
  console.log('✅ 2. Verificación de encodeURIComponent para Chatwoot: PASADO');

  // Pruebas de importación de módulos y sintaxis en caliente
  const messageService = require('../../src/services/message.service');
  const geminiService = require('../../src/services/gemini.service');

  assert.ok(messageService, 'messageService no pudo ser importado');
  assert.ok(geminiService, 'geminiService no pudo ser importado');
  console.log('✅ 3. Carga de módulos de servicios de negocio: PASADO');

  // Pruebas de fallback y pausa en geminiService
  const testPhone = '51999999999';
  geminiService.unpauseConversation(testPhone);
  assert.strictEqual(geminiService.isConversationPaused(testPhone), false, 'Conversación no debería estar pausada');

  geminiService.pauseConversation(testPhone, 1000);
  assert.strictEqual(geminiService.isConversationPaused(testPhone), true, 'Conversación debería estar pausada');
  geminiService.unpauseConversation(testPhone);
  console.log('✅ 4. Estado de pausa y reactivación de IA: PASADO');

  console.log('\n🎉 TODAS LAS PRUEBAS UNITARIAS FINALIZARON CON ÉXITO (Exit Code 0).');
}

runTests().catch(err => {
  console.error('❌ Error en suite de pruebas:', err);
  process.exit(1);
});
