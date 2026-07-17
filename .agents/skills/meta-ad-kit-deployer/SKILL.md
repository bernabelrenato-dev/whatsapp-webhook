# Skill: Meta Ad Kit Deployer

Habilidad especializada para descargar, configurar, integrar y verificar el agente inteligente de publicidad `meta-ads-kit` en un directorio independiente del webhook principal.

---

## 1. Estructura de Alojamiento y Directorios

El microservicio se aloja como un proyecto hermano a `whatsapp-webhook` para evitar la mezcla de dependencias:
*   **Directorio Webhook**: `C:\Users\USER\.gemini\antigravity\scratch\whatsapp-webhook`
*   **Directorio Ad Kit**: `C:\Users\USER\.gemini\antigravity\scratch\meta-ads-kit`

---

## 2. Pasos de Despliegue Técnico

El agente debe seguir estrictamente este flujo de instalación en el directorio `C:\Users\USER\.gemini\antigravity\scratch\meta-ads-kit`:

### A. Clonar el Repositorio
Ejecutar el comando de clonado git en la ruta de destino:
```bash
git clone https://github.com/TheMattBerman/meta-ads-kit.git C:\Users\USER\.gemini\antigravity\scratch\meta-ads-kit
```

### B. Configuración de Dependencias
Acceder al directorio e instalar los paquetes de Node.js aislados:
```bash
cd C:\Users\USER\.gemini\antigravity\scratch\meta-ads-kit
npm install
```

### C. Configuración de Variables de Entorno (`.env`)
Crear el archivo `.env` en la raíz de `meta-ads-kit` con las siguientes credenciales:
*   `GEMINI_API_KEY`: API Key para la inferencia del agente de optimización publicitaria.
*   `META_ACCESS_TOKEN`: Token de acceso del usuario del sistema (con permisos de lectura/escritura en Ads Manager y campañas).
*   `META_AD_ACCOUNT_ID`: ID de tu cuenta publicitaria de Meta (formato `act_<ID>`).
*   `META_APP_ID` y `META_APP_SECRET`: Credenciales de la aplicación en Meta for Developers.

### D. Regla de Seguridad Crítica (Aprobación Requerida)
El archivo de configuración o la lógica de ejecución del agente **nunca** debe tener autorización de auto-guardado o auto-ejecución para cambios de presupuesto superiores a **$10 USD** o equivalentes en moneda local sin antes enviar una alerta de solicitud de aprobación.

---

## 3. Integración con el Bot de Ventas de WhatsApp

Para permitir que el cliente o el administrador interactúen con el gestor de anuncios desde WhatsApp:
1. El webhook de Node.js en `whatsapp-webhook` puede exponer una ruta secreta de comando (ej: cuando el administrador escribe `"Auditoría de Anuncios"`).
2. El servidor webhook de WhatsApp hace una llamada local al microservicio de `meta-ads-kit` para generar un briefing rápido y enviarlo como un texto al chat.
