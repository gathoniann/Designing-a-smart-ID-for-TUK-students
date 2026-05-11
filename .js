const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to the smart-id-system database.');
});

// Verification Route (The core logic from Section 4.6)
app.post('/verify', (req, res) => {
    const { nfc_uid } = req.body;

    const query = 'SELECT * FROM students WHERE nfc_uid = ?';
    db.query(query, [nfc_uid], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            const student = results[0];
            // Check fee status and access rights as per Section 4.7
            if (student.fee_status === 1) {
                res.json({ 
                    status: 'Access Granted', 
                    name: student.student_name,
                    reg: student.reg_number 
                });
            } else {
                res.json({ status: 'Access Denied', message: 'Pending Fees' });
            }
        } else {
            res.json({ status: 'Access Denied', message: 'Unknown Card' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));