require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Startup env var validation — catches missing Render environment variables immediately
const REQUIRED_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error('CRITICAL: Missing required environment variables:', missing.join(', '));
    console.error('Set these in Render Dashboard → Environment before deploying.');
}

/**
 * DATABASE CONNECTION
 * Using PostgreSQL (pg) with a connection Pool.
 * Environment variables are loaded from .env via dotenv.
 */
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'smart_id_system',
    port:     parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false } // Required for secure cloud connections (e.g. Aiven, Render)
        : false
});

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('CRITICAL: Database connection failed:', err.message);
        return;
    }
    release();
    console.log('SUCCESS: Connected to PostgreSQL database.');
});

/**
 * HOME ROUTE
 * Replaces "Cannot GET /" with a professional status message.
 */
app.get('/', (req, res) => {
    res.json({
        system:     'TUK Smart ID System',
        status:     'Online',
        university: 'Technical University of Kenya',
        version:    '2.0.0',
        database:   'PostgreSQL'
    });
});

/**
 * VERIFICATION ROUTE
 * Real-time student identification via NFC UID.
 */
app.post('/verify', async (req, res) => {
    const { nfc_uid } = req.body;

    if (!nfc_uid) {
        return res.status(400).json({ status: 'Error', message: 'nfc_uid is required' });
    }

    try {
        // PostgreSQL uses $1, $2, ... numbered placeholders
        const findStudent = 'SELECT * FROM students WHERE nfc_uid = $1';
        const { rows } = await pool.query(findStudent, [nfc_uid]);

        if (rows.length > 0) {
            const student = rows[0];
            // fee_status is a BOOLEAN column in PostgreSQL — returns true/false natively
            const isCleared = student.fee_status === true;
            const status = isCleared ? 'Access Granted' : 'Access Denied';

            // Record activity in access_logs (fire-and-forget, don't block response)
            const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status) VALUES ($1, $2, $3)';
            pool.query(logQuery, [student.student_name, student.reg_number, status])
                .catch(logErr => console.error('Logging failed:', logErr.message));

            if (isCleared) {
                res.json({ status: 'Access Granted', name: student.student_name, reg: student.reg_number });
            } else {
                res.json({ status: 'Access Denied', message: 'Fee Balance Pending' });
            }
        } else {
            res.json({ status: 'Access Denied', message: 'Unknown Card' });
        }
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Verify error:', msg);
        res.status(500).json({ status: 'Error', message: msg });
    }
});

/**
 * SYSTEM LOGS
 * Displays the 10 most recent campus access events.
 */
app.get('/logs', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM access_logs ORDER BY access_time DESC LIMIT 10'
        );
        res.json(rows);
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Logs error:', msg);
        res.status(500).json({ error: msg });
    }
});

/**
 * STUDENT PORTAL
 * Retrieves profile and access history by Registration Number.
 */
app.get('/student/:reg_number', async (req, res) => {
    const { reg_number } = req.params;

    try {
        const studentQuery = 'SELECT student_name, fee_status FROM students WHERE reg_number = $1';
        const studentResult = await pool.query(studentQuery, [reg_number]);

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = studentResult.rows[0];

        const logsQuery = 'SELECT access_time, status FROM access_logs WHERE reg_number = $1 ORDER BY access_time DESC LIMIT 15';
        const logsResult = await pool.query(logsQuery, [reg_number]);

        res.json({
            name:       student.student_name,
            fee_status: student.fee_status,
            logs:       logsResult.rows
        });
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Student lookup error:', msg);
        res.status(500).json({ error: 'Database error', message: msg });
    }
});

// Use the port provided by Render (usually 10000) or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend Ready: Server running on port ${PORT}`);
});
