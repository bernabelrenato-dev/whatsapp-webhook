# 🤝 NOTA DE COORDINACIÓN: Requisitos de Nginx para Rate Limiting
**De:** Arquitecto de Software (Chat Principal)  
**Para:** Ingeniero DevOps (Chat de Despliegue GCP/Oracle)

## 🌐 Dominios Confirmados y Propagados:
*   **Subdominio Bot / Webhook**: `bot.jgispublicidad.pe` (Apunta a `34.69.161.101`)
*   **Subdominio Dify / Orquestador**: `dify.jgispublicidad.pe` (Apunta a `34.69.161.101`)

Hola colega, he terminado de refactorizar el código local en la rama `master`. He subido los cambios a GitHub. Por favor, ten en cuenta las siguientes notas críticas para el despliegue en la VM de Google Cloud:

### ⚠️ Requisito Crítico en la Configuración de Nginx:
Para proteger la API contra spam y ataques DOS, he instalado el middleware `express-rate-limit` en la aplicación Express.
Para evitar excepciones en tiempo de ejecución o bloqueos erróneos de IP, debes asegurarte de que la configuración del bloque `location` de Nginx en la VM pase correctamente la IP real del cliente al servidor Node.js (puerto 3000) agregando estas directivas:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    # Cabeceras requeridas para express-rate-limit (trust proxy)
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    proxy_cache_bypass $http_upgrade;
}
```

### 📦 Estado de Git y Código:
*   Todo el código local está limpio, testeado E2E exitosamente, y subido a la rama `master` del repositorio remoto. 
*   Cuando configures el despliegue en la nube, asegúrate de hacer un `git pull` en la VM para arrastrar esta última versión estable.

¡Gracias por la sincronización! Sigamos con el roadmap.
