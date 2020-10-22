require('dotenv').config();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const cors = require('cors');
const express = require('express');
const app = express();
const port = 3001;

const mysql = require('mysql2/promise');
let connection;

const { STATUS_OK, STATUS_ERROR } = require('./enum/statuses.js');

app.use(cors());

app.get('/', async (req, res) => {
    res.send(`Hello World!`);
});

app.get('/statuses', async (req, res) => {
    const [rows, fields] = await connection.execute('SELECT * FROM statuses');
    res.send(JSON.stringify(rows));
});

app.get('/heartbeat', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        res.statusCode = 401;
        res.send("Unauthorized - missing token");
        return;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    }
    catch {
        res.statusCode = 401;
        res.send("Unauthorized");
        return;
    }

    const { service_id } = decoded;

    if (!service_id || isNaN(service_id)) {
        res.statusCode = 400;
        res.send("Wrong token");
    }

    await connection.execute('INSERT INTO service_log (service_id, service_status) VALUES (?,?)', [service_id, STATUS_OK]);

    res.send("Updated");
});

app.get('/error', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        res.statusCode = 401;
        res.send("Unauthorized - missing token");
        return;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    }
    catch {
        res.statusCode = 401;
        res.send("Unauthorized");
        return;
    }

    const { service_id } = decoded;

    if (!service_id || isNaN(service_id)) {
        res.statusCode = 400;
        res.send("Wrong token");
    }

    await connection.execute('INSERT INTO service_log (service_id, service_status) VALUES (?,?)', [service_id, STATUS_ERROR]);

    res.send("Updated");
});

app.get('/token', async (req, res) => {
    res.statusCode = 400;
    res.send("Use the provided console script.");
    return;

    const { service_id } = req.query;

    if (isNaN(service_id)) {
        res.statusCode = 400;
        res.send("Incorrect service_id");
        return;
    }

    const [rows, fields] = await connection.execute('SELECT * FROM services WHERE id = ?', [service_id]);

    if (rows.length !== 1) {
        res.statusCode = 400;
        res.send("Incorrect service_id");
        return;
    }

    const token = jwt.sign({ service_id: rows[0].id }, JWT_SECRET);
    res.send(token);

});

app.get('/services', async (req, res) => {
    const [rows, fields] = await connection.execute('SELECT * FROM services');
    res.send(JSON.stringify(rows));
});

app.get('/services/log', async (req, res) => {
    let { interval, limit } = req.query;

    if (isNaN(interval) || !interval) {
        interval = 7;
    }

    if (isNaN(limit) || !limit) {
        limit = 20;
    }

    const [rows, fields] = await connection.execute('SELECT * FROM service_log WHERE DATE(inserted_at) > (NOW() - INTERVAL ? DAY) ORDER BY inserted_at DESC LIMIT ?', [interval, limit]);
    res.send(JSON.stringify(rows));
});

app.get('/service/log', async (req, res) => {
    const { service_id } = req.query;
    let { interval, limit } = req.query;

    if (isNaN(interval) || !interval) {
        interval = 7;
    }

    if (isNaN(limit) || !limit) {
        limit = 20;
    }

    if (isNaN(service_id)) {
        res.statusCode = 400;
        res.send("Incorrect service_id");
        return;
    }

    const [rows, fields] = await connection.execute('SELECT * FROM service_log WHERE service_id = ? AND DATE(inserted_at) > (NOW() - INTERVAL ? DAY) ORDER BY inserted_at DESC LIMIT ?', [service_id, interval, limit]);
    res.send(JSON.stringify(rows));
});

app.listen(port, async () => {
    connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    console.log(`Example app listening at http://localhost:${port}`);
});