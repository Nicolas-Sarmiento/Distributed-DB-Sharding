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
