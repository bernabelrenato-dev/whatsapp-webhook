# Skill: Google Sheets to PostgreSQL Synchronization Protocol

Guía y especificación técnica para sincronizar catálogos de merchandising editados en Google Sheets hacia la base de datos PostgreSQL de producción del sitio web.

---

## 1. Diseño del Flujo de Trabajo (Sheets ➔ Postgres)

```text
[ Proveedor ] ➔ [ Ingesta IA ] ➔ [ Google Sheets (Borrador) ]
                                            │
                                    (Edición / Margen)
                                            │
                                            ▼
[ Postgres Web ] 🗲 Sincronizador 🗲 [ Fila Aprobada (Status: "Approved") ]
```

1.  **Ingesta**: Un script/agente lee el catálogo original (PDF/Excel) y escribe filas en la hoja **Google Sheets** con las columnas básicas: `código`, `nombre`, `precio_costo`, `precio_venta`, `color`, `categoria`, `estado_aprobado` y `sincronizado`.
2.  **Copia Borrador en Sheets**: El administrador edita descripciones, ajusta márgenes de precio, y marca la columna `estado_aprobado` como `Approved`.
3.  **Ejecución de Sincronización**: Un script cron o endpoint de API lee las filas del Sheets que cumplen con `estado_aprobado = 'Approved'` y `sincronizado = false`.
4.  **Inyección en Postgres**: Se realiza una query de tipo UPSERT (insertar o actualizar si ya existe el código del producto).
5.  **Confirmación**: El script actualiza la columna `sincronizado` en Google Sheets a `true` junto con la marca de tiempo de la actualización.

---

## 2. Configuración y Credenciales

Para que el sincronizador se conecte a ambas plataformas, requiere las siguientes variables de entorno:
*   `GOOGLE_SPREADSHEET_ID`: Identificador de la hoja de Google Sheets.
*   `GOOGLE_SERVICE_ACCOUNT_KEY`: JSON de credenciales de la cuenta de servicio de Google Cloud Console.
*   `DATABASE_URL`: URI de conexión a PostgreSQL (ej. `postgresql://usuario:password@host:port/dbname`).

---

## 3. Plantilla de Sincronizador en Node.js (Boilerplate)

```javascript
const { google } = require('googleapis');
const { Client } = require('pg');

async function syncSheetsToPostgres() {
  // 1. Inicializar Clientes
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  // 2. Leer Datos de Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: 'Productos!A2:H', // Código, Nombre, Precio, etc.
  });
  const rows = response.data.values || [];

  for (let i = 0; i < rows.length; i++) {
    const [codigo, nombre, precio, color, categoria, aprobado, sincronizado] = rows[i];
    
    // Procesar solo filas aprobadas no sincronizadas
    if (aprobado === 'Approved' && sincronizado !== 'true') {
      // 3. Ejecutar UPSERT en Postgres
      const query = `
        INSERT INTO "Productos" (codigo, nombre, precio, color, categoria, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (codigo) 
        DO UPDATE SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, color = EXCLUDED.color, updated_at = NOW();
      `;
      await pgClient.query(query, [codigo, nombre, parseFloat(precio), color, categoria]);

      // 4. Marcar como sincronizado en Sheets (Fila i+2 por cabecera y base 0)
      const rowIndex = i + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
        range: `Productos!H${rowIndex}`, // Columna H (Sincronizado)
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['true']] },
      });
    }
  }

  await pgClient.end();
}
```

---

## 4. TEP (Protocolo de Ahorro de Tokens)

*   **Evitar Cargar Dumps**: Las configuraciones de base de datos grandes o tablas JSON nunca deben cargarse completas al modelo de IA.
*   **Lectura Bajo Demanda**: El agente sincronizador solo debe solicitar la estructura de las tablas de Postgres necesarias (`\d Tabla`) y no los registros de base de datos para no saturar el prompt.
