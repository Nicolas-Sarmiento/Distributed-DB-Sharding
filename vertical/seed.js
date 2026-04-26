const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function sembrarDatos() {
    console.log("Iniciando el sembrado de datos con Sharding Vertical en Vitess...");

    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 15306,
            user: 'root',
            database: ''
        });

        const prefijos = ['node', 'react', 'python', 'django', 'docker', 'kube', 'linux', 'apache', 'nginx', 'go', 'ruby', 'java'];
        const sufijos = ['-core', '-utils', '-cli', '-web', '-auth', '-api', '-db', '-tools', '-proxy', '-logger'];
        const autores = ['Meta', 'Google', 'Apache', 'Microsoft', 'Comunidad', 'OpenSource Org', 'RedHat'];

        console.log("Insertando 500 paquetes de software...");

        for (let i = 1; i <= 500; i++) {
            const nombreAleatorio = prefijos[Math.floor(Math.random() * prefijos.length)] +
                sufijos[Math.floor(Math.random() * sufijos.length)];
            const version = `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`;
            const licencia = i % 2 === 0 ? 'MIT' : 'Apache 2.0';
            const autor = autores[Math.floor(Math.random() * autores.length)];
            const descripcion = `Librería ${nombreAleatorio} para desarrollo moderno.`;
            const url = `github.com/${autor.toLowerCase().replace(' ', '')}/${nombreAleatorio}`;

            const uid = crypto.randomUUID();

            // Insertar en Keyspace 1: Core
            await connection.execute(
                'INSERT INTO software_core.packages_core (package_id, package_name, package_version, package_license) VALUES (?, ?, ?, ?)',
                [uid, nombreAleatorio, version, licencia]
            );

            // Insertar en Keyspace 2: Details
            await connection.execute(
                'INSERT INTO software_details.packages_details (package_id, author, description, repository_url) VALUES (?, ?, ?, ?)',
                [uid, autor, descripcion, url]
            );

            // Progreso
            if (i % 100 === 0) {
                console.log(`... ${i} paquetes insertados`);
            }
        }

        console.log("¡Sembrado completado con éxito! Los 500 registros se distribuyeron en los 2 Keyspaces.");
        await connection.end();

    } catch (error) {
        console.error("Error durante el sembrado:", error);
    }
}

sembrarDatos();
