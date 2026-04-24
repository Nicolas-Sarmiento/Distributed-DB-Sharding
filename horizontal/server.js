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
    database: 'repo_software'
};


app.post('/packages', async (req, res) => {
    try {
        const { packageName, packageVersion, packageLicense } = req.body;
        const packageId = crypto.randomUUID();

        const connection = await mysql.createConnection(DB_CONFIG);
        await connection.execute(
            'INSERT INTO software_packages (packageId, packageName, packageVersion, packageLicense) VALUES (?, ?, ?, ?)',
            [packageId, packageName, packageVersion, packageLicense]
        );
        await connection.end();

        res.status(201).json({ message: 'Paquete creado', packageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/packages/', async (req, res) => {
    try {
        const connection = await mysql.createConnection(DB_CONFIG);
        const [rows] = await connection.execute('SELECT * FROM software_packages;');
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
        
        const [rows] = await connection.execute(
            'SELECT * FROM software_packages WHERE packageId = ?', 
            [packageId]
        );

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }

        const shards = ['-55', '55-aa', 'aa-'];
        let shardUbicacion = "Desconocido";

        for (const nombreShard of shards) {
            const configShard = { ...DB_CONFIG, database: `repo_software/${nombreShard}` };
            const connShard = await mysql.createConnection(configShard);
           
            const [resultadoShard] = await connShard.execute(
                'SELECT packageId FROM software_packages WHERE packageId = ?',
                [packageId]
            );
            await connShard.end();

            if (resultadoShard.length > 0) {
                shardUbicacion = nombreShard;
                break; 
            }
        }

        res.json({
            shard_ubicacion: shardUbicacion,
            data: rows[0]
        });

    } catch (error) {
        res.status(500).json({ error: `Error al localizar shard: ${error.message}` });
    }
});

app.put('/packages/:id', async (req, res) => {
    try {
        const { packageName, packageVersion, packageLicense } = req.body;
        const packageId = req.params.id;

        const connection = await mysql.createConnection(DB_CONFIG);
        
        const [result] = await connection.execute(
            'UPDATE software_packages SET packageName = ?, packageVersion = ?, packageLicense = ? WHERE packageId = ?',
            [packageName, packageVersion, packageLicense, packageId]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }

        res.json({ message: 'Paquete actualizado con éxito', packageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/packages/:id', async (req, res) => {
    try {
        const packageId = req.params.id;

        const connection = await mysql.createConnection(DB_CONFIG);
        
        const [result] = await connection.execute(
            'DELETE FROM software_packages WHERE packageId = ?',
            [packageId]
        );
        await connection.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Paquete no encontrado' });
        }

        res.json({ message: 'Paquete eliminado correctamente', packageId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/shard/:name', async (req, res) => {
    const shardName = req.params.name; //  "-55", "55-aa", "aa-"
    
    try {
    
        const shardConfig = { ...DB_CONFIG, database: `repo_software/${shardName}` };
        const connection = await mysql.createConnection(shardConfig);
        
        const [rows] = await connection.execute('SELECT * FROM software_packages');
        await connection.end();

        res.json({
            shard: shardName,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        res.status(500).json({ error: `Error consultando shard ${shardName}: ${error.message}` });
    }
});

app.listen(3000, () => {
    console.log('API de Repositorio Distribuido corriendo en http://localhost:3000');
});