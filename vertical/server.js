const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DB_CONFIG = {
    host: '127.0.0.1',
    port: 15306,
    user: 'root',
    database: ''
};

app.post('/packages', async (req, res) => {
    try {
        const {
            packageName, packageVersion, packageLicense,
            author, description, repositoryUrl
        } = req.body;
        const packageId = crypto.randomUUID();

        const connection = await mysql.createConnection(DB_CONFIG);

        // Inserción en el Keyspace software_core
        await connection.execute(
            'INSERT INTO software_core.packages_core (package_id, package_name, package_version, package_license) VALUES (?, ?, ?, ?)',
            [packageId, packageName, packageVersion, packageLicense]
        );

        // Inserción en el Keyspace software_details
        await connection.execute(
            'INSERT INTO software_details.packages_details (package_id, author, description, repository_url) VALUES (?, ?, ?, ?)',
            [packageId, author, description, repositoryUrl]
        );

        await connection.end();

        res.status(201).json({ message: 'Paquete creado con sharding vertical en Vitess', packageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/packages/', async (req, res) => {
    try {
        const connection = await mysql.createConnection(DB_CONFIG);

        const [rows] = await connection.execute(`
            SELECT c.*, d.author, d.description, d.repository_url, d.created_at 
            FROM software_core.packages_core c
            LEFT JOIN software_details.packages_details d ON c.package_id = d.package_id;
        `);

        await connection.end();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/packages/:id', async (req, res) => {
    try {
        const packageId = req.params.id;
        const connection = await mysql.createConnection(DB_CONFIG);

        const [rows] = await connection.execute(`
            SELECT c.*, d.author, d.description, d.repository_url, d.created_at 
            FROM software_core.packages_core c
            LEFT JOIN software_details.packages_details d ON c.package_id = d.package_id
            WHERE c.package_id = ?
        `, [packageId]);

        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }

        res.json({
            sharding: "Vertical",
            orquestador: "Vitess (VTGate)",
            data: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('API de Sharding Vertical con Vitess y MySQL corriendo en http://localhost:3000');
});
