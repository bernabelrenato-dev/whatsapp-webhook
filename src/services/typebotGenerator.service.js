const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const crypto = require('crypto');
const logger = require('../utils/logger');

class TypebotGeneratorService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@jgis-postgres:5432/typebot'
    });
  }

  /**
   * Genera y publica automáticamente un flujo completo de Typebot a partir de un prompt descriptivo.
   * @param {string} promptText Descripción en español del flujo deseado.
   * @returns {Promise<{ typebotId: string, publicId: string, name: string, editUrl: string }>}
   */
  async generateAndPublishFlow(promptText) {
    logger.info({ msg: '🧠 Generando esquema JSON de Typebot...', promptText });

    const systemInstruction = `
      Eres un Arquitecto de Software Experto en Typebot.
      Tu tarea es recibir la descripción de un bot comercial en español y generar un objeto JSON válido para Typebot v6.
      
      ESTRUCTURA DE SALIDA REQUERIDA (JSON ESTRICTO):
      {
        "name": "Nombre descriptivo del flujo",
        "groups": [
          {
            "id": "group_start",
            "title": "Bienvenida y Captura",
            "graphPosition": { "x": 0, "y": 0 },
            "blocks": [
              {
                "id": "block_intro",
                "type": "text",
                "content": {
                  "richText": [
                    { "children": [{ "text": "Mensaje de bienvenida..." }] }
                  ]
                }
              },
              {
                "id": "block_input_1",
                "type": "text input",
                "options": {
                  "labels": { "placeholder": "Escribe aquí..." },
                  "variableId": "var_respuesta"
                }
              }
            ]
          }
        ],
        "variables": [
          { "id": "var_respuesta", "name": "Respuesta" }
        ],
        "edges": []
      }

      REGLAS OBLIGATORIAS:
      1. Responde ÚNICAMENTE con el objeto JSON válido. No uses bloque de código markdown ni texto adicional.
      2. Crea preguntas claras, mensajes profesionales de merchandising y captura de variables necesarias.
      3. Todos los IDs de bloques y variables deben ser cadenas compuestas únicas (ej: "b_welcome_1", "v_cantidad").
    `;

    let cleanJsonText = null;

    // Intentar A: Gemini AI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const modelNames = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro-latest'];
        for (const mName of modelNames) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const aiRes = await model.generateContent([systemInstruction, promptText]);
            const rawText = aiRes.response.text().trim();
            cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            if (cleanJsonText) {
              logger.info({ msg: '✅ Esquema JSON de Typebot generado exitosamente con Gemini', model: mName });
              break;
            }
          } catch (e) {
            logger.warn({ msg: 'Intento fallido con modelo Gemini', model: mName, error: e.message });
          }
        }
      } catch (err) {
        logger.warn({ msg: 'Error de inicializacion en Gemini AI', error: err.message });
      }
    }

    // Intentar B: DeepSeek AI Fallback
    if (!cleanJsonText && process.env.DEEPSEEK_API_KEY) {
      try {
        const axios = require('axios');
        const dsRes = await axios.post('https://api.deepseek.com/chat/completions', {
          model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: promptText }
          ],
          temperature: 0.3
        }, {
          headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
          timeout: 15000
        });
        const rawText = dsRes.data.choices[0].message.content.trim();
        cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        logger.info({ msg: '✅ Esquema JSON de Typebot generado exitosamente con DeepSeek AI' });
      } catch (dsErr) {
        logger.error({ msg: 'Error al generar con DeepSeek AI', error: dsErr.message });
      }
    }

    if (!cleanJsonText) {
      throw new Error('No se pudo generar el esquema JSON de Typebot con Gemini ni DeepSeek');
    }

    let flowData;
    try {
      flowData = JSON.parse(cleanJsonText);
    } catch (err) {
      logger.error({ msg: 'Error al parsear el JSON generado por Gemini', rawText });
      throw new Error('La IA no generó un JSON válido para Typebot.');
    }

    const name = flowData.name || `Flujo Creado por IA ${new Date().toLocaleDateString('es-PE')}`;
    const groups = JSON.stringify(flowData.groups || []);
    const variables = JSON.stringify(flowData.variables || []);
    const edges = JSON.stringify(flowData.edges || []);
    const theme = JSON.stringify({ general: { background: { type: 'Color', content: '#ffffff' } } });
    const settings = JSON.stringify({ typingEmulation: { enabled: true, speed: 40 } });

    // 1. Obtener o asignar workspaceId
    const wsRes = await this.pool.query(`SELECT id FROM "Workspace" LIMIT 1;`);
    const workspaceId = wsRes.rows[0]?.id || `ws_${crypto.randomBytes(6).toString('hex')}`;

    const typebotId = `tb_${crypto.randomBytes(8).toString('hex')}`;
    const publicId = `pub_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();

    // 2. Insertar en tabla "Typebot"
    await this.pool.query(
      `INSERT INTO "Typebot" (id, name, groups, variables, edges, theme, settings, "publicId", "workspaceId", "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, '6');`,
      [typebotId, name, groups, variables, edges, theme, settings, publicId, workspaceId, now]
    );

    // 3. Publicar directamente en tabla "PublicTypebot"
    await this.pool.query(
      `INSERT INTO "PublicTypebot" (id, "typebotId", name, groups, variables, edges, theme, settings, "createdAt", "updatedAt", version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, '6')
       ON CONFLICT (id) DO UPDATE SET groups = EXCLUDED.groups, variables = EXCLUDED.variables, edges = EXCLUDED.edges, "updatedAt" = EXCLUDED."updatedAt";`,
      [publicId, typebotId, name, groups, variables, edges, theme, settings, now]
    );

    const baseUrl = process.env.PUBLIC_URL || 'https://bot.jgispublicidad.pe';
    const editUrl = `${baseUrl}/typebot/typebots/${typebotId}/edit`;

    logger.info({ msg: '🎉 ¡Flujo de Typebot Creado y Publicado con Éxito!', typebotId, publicId, name, editUrl });

    return {
      typebotId,
      publicId,
      name,
      editUrl
    };
  }
}

module.exports = new TypebotGeneratorService();
