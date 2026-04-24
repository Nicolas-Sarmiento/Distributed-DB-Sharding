// seed.js
const mysql = require('mysql2/promise');
const crypto = require('crypto');

async function sembrarDatos() {
    console.log("Iniciando el sembrado de datos en Vitess...");

    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 15306,
            user: 'root',
            database: 'repo_software'
        });

        const prefijos = ['node', 'react', 'python', 'django', 'docker', 'kube', 'linux', 'apache', 'nginx', 'go'];
        const sufijos = ['-core', '-utils', '-cli', '-web', '-auth', '-api', '-db', '-tools'];

        console.log("Insertando 300 paquetes de software...");
        for (let i = 1; i <= 300; i++) {
            const nombreAleatorio = prefijos[Math.floor(Math.random() * prefijos.length)] + 
                                   sufijos[Math.floor(Math.random() * sufijos.length)];
            const version = `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`;
            const licencia = i % 2 === 0 ? 'MIT' : 'GPL'; // Alternamos licencias
            const uid = crypto.randomUUID();
           
            await connection.execute(
                'INSERT INTO software_packages (packageId, packageName, packageVersion, packageLicense ) VALUES (?, ?, ?, ?)',
                [uid, nombreAleatorio, version, licencia]
            );
        }

        console.log("¡Sembrado completado con éxito! Los 3 shards están llenos.");
        await connection.end();

    } catch (error) {
        console.error("Error durante el sembrado:", error);
    }
}

sembrarDatos();