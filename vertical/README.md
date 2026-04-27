# Sharding Vertical con Vitess y MySQL

Este proyecto demuestra el concepto de **Sharding Vertical** utilizando **Vitess y MySQL**. A diferencia del proyecto horizontal que distribuye los registros de una misma tabla en múltiples shards dentro del mismo "Keyspace", aquí utilizamos **múltiples Keyspaces** para separar las columnas de una entidad lógica.

## Arquitectura

El sharding vertical consiste en dividir una tabla lógica por sus columnas en diferentes bases de datos o servidores físicos.

Para este proyecto, la tabla principal `software_packages` (que lógicamente tiene 9 columnas) se ha dividido en dos tablas almacenadas en diferentes *Keyspaces* de Vitess:

1. **Keyspace `software_core`:**
   Almacena la tabla `packages_core` con los datos críticos.
   - `package_id` (PK)
   - `package_name`
   - `package_version`
   - `package_license`

2. **Keyspace `software_details`:**
   Almacena la tabla `packages_details` con los metadatos o detalles secundarios.
   - `package_id` (PK)
   - `author`
   - `description`
   - `repository_url`
   - `created_at`

VTGate (el proxy de Vitess) nos permite realizar consultas tipo `JOIN` que cruzan los límites de los Keyspaces (Cross-Keyspace Joins) de manera transparente para nuestra aplicación NodeJS.

## Requisitos
- Node.js
- Docker
- Docker Compose

## Pasos de Ejecución

### 1. Iniciar y Configurar Nodos (Vitess)
Abre una terminal en la carpeta `vertical/` y ejecuta:
```bash
docker-compose up -d
```
> **Nota:** La inicialización está automatizada. Un contenedor llamado `auto_init_vitess` ejecutará por detrás los comandos necesarios para crear los Keyspaces, configurar las tablets primarias y aplicar los esquemas y VSchemas. Espera unos **20-30 segundos** antes de avanzar al siguiente paso para que termine el proceso.

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Poblado de Datos (Seed)
Para tener datos de prueba, puedes ejecutar el script de sembrado que insertará automáticamente 500 registros. Como estamos usando Sharding Vertical, el script dividirá las columnas y hará inserciones tanto en el keyspace `software_core` como en `software_details`:

```bash
node seed.js
```

### 4. Ejecutar el Servidor
```bash
npm start
```
El servidor escuchará en `http://localhost:3000`.

## Frontend (General)

Este repositorio incluye un frontend React ubicado en la **raíz del proyecto** (al mismo nivel que `vertical/` y `horizontal/`).

El frontend es **general** y puede usarse para visualizar e insertar datos contra cualquier backend compatible con estos endpoints:
- `POST /packages`
- `GET /packages`
- `GET /packages/:id`

### Orden recomendado para levantar todo
1. Levantar Vitess/MySQL en `vertical/`:
```bash
docker compose up -d
```
2. Ejecutar backend en `vertical/`:
```bash
npm start
```
3. Desde la **raíz del proyecto**, ejecutar frontend:
```bash
cd frontend
npm install
npm run dev
```

Con eso, el frontend consumirá el backend en `http://localhost:3000`.

## Probar la API (Postman o CURL)

1. **Crear un paquete:**
   Envía un `POST` a `http://localhost:3000/packages` con el siguiente cuerpo JSON:
   ```json
   {
     "packageName": "React",
     "packageVersion": "18.2.0",
     "packageLicense": "MIT",
     "author": "Meta",
     "description": "Librería de UI",
     "repositoryUrl": "github.com/facebook/react"
   }
   ```
   *Vitess enrutará las 4 primeras columnas al Keyspace Core y el resto al Keyspace Details.*

2. **Obtener paquetes (Cross-Keyspace Join):**
   Realiza un `GET` a `http://localhost:3000/packages`.
   *VTGate se encargará de hacer la unión de ambas tablas subyacentes sin que tu aplicación deba preocuparse por conectarse a dos servidores distintos.*

## Solución de Problemas

Si ves errores como:
- `unknown database 'software_core' in vschema`
- `no healthy tablet available for keyspace software_core`

normalmente la inicialización automática no terminó correctamente.

1. Baja el stack y limpia volúmenes:
```bash
docker compose down -v
```

2. Sube servicios:
```bash
docker compose up -d
```

3. Re-ejecuta la inicialización de Vitess manualmente:
```bash
docker compose run --rm auto_init_vitess
```

4. Revisa que no haya errores en tablets:
```bash
docker compose logs --tail=100 vttablet_core
docker compose logs --tail=100 vttablet_details
```

5. Ejecuta el seed otra vez:
```bash
node seed.js
```

Nota en Windows: los scripts `.sh` deben usar saltos de línea `LF`. Este repositorio fuerza eso con `.gitattributes`.
