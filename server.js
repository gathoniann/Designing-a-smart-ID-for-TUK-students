require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * PASSWORD HASHING HELPER
 * Hashes passwords securely using PBKDF2 with SHA-512.
 */
function hashPassword(password) {
    const salt = 'tuk_smart_id_salt_2026';
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}


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
 * STUDENT LOGIN ROUTE
 * Authenticates a student by reg_number + password.
 * The password is stored as plain text in the students table for this prototype.
 * In production, use bcrypt hashing.
 */
app.post('/login', async (req, res) => {
    const { reg_number, password } = req.body;

    if (!reg_number || !password) {
        return res.status(400).json({ success: false, message: 'Registration number and password are required.' });
    }

    try {
        const hashedPassword = hashPassword(password);
        const query = 'SELECT student_name, reg_number, fee_status FROM students WHERE reg_number = $1 AND password = $2';
        const result = await pool.query(query, [reg_number, hashedPassword]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid registration number or password.' });
        }

        const student = result.rows[0];
        res.json({
            success: true,
            message: 'Login successful',
            name: student.student_name,
            reg_number: student.reg_number
        });
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Login error:', msg);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

/**
 * ADMIN LOGIN ROUTE
 * Authenticates an admin by username + password.
 */
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        const hashedPassword = hashPassword(password);
        const query = 'SELECT username FROM admins WHERE username = $1 AND password = $2';
        const result = await pool.query(query, [username, hashedPassword]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        const admin = result.rows[0];
        res.json({
            success: true,
            message: 'Login successful',
            username: admin.username
        });
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Admin login error:', msg);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});


/**
 * VERIFICATION ROUTE
 * Real-time student identification via NFC UID.
 */
app.post('/verify', async (req, res) => {
    const { nfc_uid } = req.body;
    const facility = req.body.facility || 'Main Gate';

    if (!nfc_uid) {
        return res.status(400).json({ status: 'Error', message: 'nfc_uid is required' });
    }

    try {
        const findStudent = 'SELECT * FROM students WHERE nfc_uid = $1';
        const { rows } = await pool.query(findStudent, [nfc_uid]);

        if (rows.length > 0) {
            const student = rows[0];
            
            // 1. Verify Facility Access
            const allowed = student.allowed_facilities || 'Main Gate, Main Library';
            const allowedList = allowed.split(',').map(f => f.trim());
            const isAllowedFacility = allowedList.includes(facility);

            if (!isAllowedFacility) {
                const status = 'Access Denied: Unauthorized Facility';
                const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status, facility) VALUES ($1, $2, $3, $4)';
                pool.query(logQuery, [student.student_name, student.reg_number, status, facility])
                    .catch(logErr => console.error('Logging failed:', logErr.message));
                
                return res.json({ status: 'Access Denied', message: 'Unauthorized Facility Access' });
            }

            // 2. Verify Fee Status
            const isCleared = student.fee_status === true;
            if (isCleared) {
                const status = 'Access Granted';
                const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status, facility) VALUES ($1, $2, $3, $4)';
                pool.query(logQuery, [student.student_name, student.reg_number, status, facility])
                    .catch(logErr => console.error('Logging failed:', logErr.message));

                res.json({ status: 'Access Granted', name: student.student_name, reg: student.reg_number });
            } else {
                const status = 'Access Denied: Fee Balance';
                const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status, facility) VALUES ($1, $2, $3, $4)';
                pool.query(logQuery, [student.student_name, student.reg_number, status, facility])
                    .catch(logErr => console.error('Logging failed:', logErr.message));

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
        const studentQuery = 'SELECT student_name, fee_status, nfc_uid, program, wallet_balance FROM students WHERE reg_number = $1';
        const studentResult = await pool.query(studentQuery, [reg_number]);

        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = studentResult.rows[0];

        const logsQuery = 'SELECT access_time, status, facility FROM access_logs WHERE reg_number = $1 ORDER BY access_time DESC LIMIT 15';
        const logsResult = await pool.query(logsQuery, [reg_number]);

        const transactionsQuery = 'SELECT transaction_id, service_point, amount, transaction_type, transaction_time FROM transactions WHERE reg_number = $1 ORDER BY transaction_time DESC LIMIT 10';
        const transactionsResult = await pool.query(transactionsQuery, [reg_number]);

        res.json({
            name:           student.student_name,
            fee_status:     student.fee_status,
            nfc_uid:        student.nfc_uid,
            program:        student.program,
            wallet_balance: student.wallet_balance,
            logs:           logsResult.rows,
            transactions:   transactionsResult.rows
        });
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Student lookup error:', msg);
        res.status(500).json({ error: 'Database error', message: msg });
    }
});

/**
 * PAYMENT ROUTE
 * Deducts balance from student's wallet using NFC UID.
 */
app.post('/pay', async (req, res) => {
    const { nfc_uid, amount, service_point } = req.body;

    if (!nfc_uid || amount === undefined || !service_point) {
        return res.status(400).json({ success: false, message: 'Missing payment details.' });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Find student and lock the row for update
            const studentQuery = 'SELECT reg_number, student_name, wallet_balance FROM students WHERE nfc_uid = $1 FOR UPDATE';
            const studentResult = await client.query(studentQuery, [nfc_uid]);

            if (studentResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Student not found / Unknown Card.' });
            }

            const student = studentResult.rows[0];
            const currentBalance = parseFloat(student.wallet_balance);

            if (currentBalance < paymentAmount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: 'Insufficient funds.' });
            }

            const newBalance = currentBalance - paymentAmount;

            // Deduct balance
            await client.query('UPDATE students SET wallet_balance = $1 WHERE reg_number = $2', [newBalance, student.reg_number]);

            // Log transaction
            await client.query(
                'INSERT INTO transactions (reg_number, service_point, amount, transaction_type) VALUES ($1, $2, $3, \'DEBIT\')',
                [student.reg_number, service_point, paymentAmount]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Payment Successful',
                student_name: student.student_name,
                reg_number: student.reg_number,
                amount_deducted: paymentAmount,
                new_balance: newBalance
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Payment error:', msg);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

/**
 * TOP-UP ROUTE
 * Loads balance to a student's wallet using Registration Number.
 */
app.post('/topup', async (req, res) => {
    const { reg_number, amount } = req.body;

    if (!reg_number || amount === undefined) {
        return res.status(400).json({ success: false, message: 'Registration number and amount are required.' });
    }

    const topupAmount = parseFloat(amount);
    if (isNaN(topupAmount) || topupAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid top-up amount.' });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const studentQuery = 'SELECT student_name, wallet_balance FROM students WHERE reg_number = $1 FOR UPDATE';
            const studentResult = await client.query(studentQuery, [reg_number]);

            if (studentResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: 'Student not found.' });
            }

            const student = studentResult.rows[0];
            const currentBalance = parseFloat(student.wallet_balance);
            const newBalance = currentBalance + topupAmount;

            // Update balance
            await client.query('UPDATE students SET wallet_balance = $1 WHERE reg_number = $2', [newBalance, reg_number]);

            // Log transaction
            await client.query(
                'INSERT INTO transactions (reg_number, service_point, amount, transaction_type) VALUES ($1, \'Online Top-Up\', $2, \'CREDIT\')',
                [reg_number, topupAmount]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Top-up Successful',
                student_name: student.student_name,
                amount_added: topupAmount,
                new_balance: newBalance
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Top-up error:', msg);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

/**
 * RECENT TRANSACTIONS ROUTE
 * Displays the 10 most recent campus wallet transactions.
 */
app.get('/transactions', async (req, res) => {
    try {
        const query = `
            SELECT t.*, s.student_name 
            FROM transactions t
            JOIN students s ON t.reg_number = s.reg_number
            ORDER BY t.transaction_time DESC 
            LIMIT 10
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        const msg = err.message || err.toString();
        console.error('Transactions fetch error:', msg);
        res.status(500).json({ error: 'Database error' });
    }
});

// Use the port provided by Render (usually 10000) or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend Ready: Server running on port ${PORT}`);
});
