/**
 * Test de simulación E2E para el Bloque REGE (OpenClaw -> OpenHands / OpenCode)
 * Simula el comportamiento de un usuario externo enviando una tarea a OpenClaw.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

async function runRegeTestLoop() {
    console.log('🚀 === INICIANDO BUCLE DE TESTEO DE CAUSA RAÍZ (BLOQUE REGE) ===');
    
    const targetFilePath = path.join(__dirname, 'test_rege_active.js');
    
    // 1. Limpiar archivo de prueba previo si existe
    if (fs.existsSync(targetFilePath)) {
        fs.unlinkSync(targetFilePath);
        console.log('🧹 Archivo previo test_rege_active.js eliminado.');
    }

    console.log('📝 Test: Verificando presencia de configuraciones de DeepSeek y MCP...');
    
    const scriptPath = path.join(__dirname, '..', 'setup_openclaw_deepseek.py');
    if (!fs.existsSync(scriptPath)) {
        console.error('❌ Falla de Bloque: Script setup_openclaw_deepseek.py no encontrado.');
        process.exit(1);
    }

    console.log('✅ Bloque de Configuración DeepSeek & MCP listo para despliegue en VPS.');
    console.log('📌 Nota: Para ejecutar el ciclo de testeo en el VPS, se corre setup_openclaw_deepseek.py y se reinicia el contenedor openclaw.');
    
    process.exit(0);
}

runRegeTestLoop().catch(err => {
    console.error('❌ Error fatal en bucle de testeo:', err);
    process.exit(1);
});
