const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/** * DATABASE CONNECTION
 * Using Environment Variables (MYSQL_...) to satisfy security requirements.
 * SSL is required for the Aiven cloud connection.
 */
const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'defaultdb',
    port: process.env.MYSQL_PORT || 23312,
    ssl: {
        rejectUnauthorized: false // Required for cloud-to-cloud connection
    }
});

db.connect(err => {
    if (err) {
        console.error('CRITICAL: Database connection failed:', err.message);
        return;
    }
    console.log('SUCCESS: Connected to Aiven Cloud Database.');
});

/** * VERIFICATION ROUTE
 * Handles real-time student identification via NFC UID.
 */
app.post('/verify', (req, res) => {
    const { nfc_uid } = req.body;
    const findStudent = 'SELECT * FROM students WHERE nfc_uid = ?';
    
    db.query(findStudent, [nfc_uid], (err, results) => {
        if (err) return res.status(500).json({ status: 'Error', message: err.message });

        if (results.length > 0) {
            const student = results[0];
            const status = (student.fee_status === 1) ? 'Access Granted' : 'Access Denied';
            
            // Log the activity to the database
            const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status) VALUES (?, ?, ?)';
            db.query(logQuery, [student.student_name, student.reg_number, status], (logErr) => {
                if (logErr) console.error('Logging failed:', logErr.message);
            });

            if (student.fee_status === 1) {
                res.json({ status: 'Access Granted', name: student.student_name, reg: student.reg_number });
            } else {
                res.json({ status: 'Access Denied', message: 'Fee Balance Pending' });
            }
        } else {
            res.json({ status: 'Access Denied', message: 'Unknown Card' });
        }
    });
});

/** * SYSTEM LOGS
 * Displays the 10 most recent campus access events.
 */
app.get('/logs', (req, res) => {
    db.query('SELECT * FROM access_logs ORDER BY access_time DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send(err.message);
        res.json(results);
    });
});

/** * STUDENT PORTAL
 * Retrieves profile and specific access history by Registration Number.
 */
app.get('/student/:reg_number', (req, res) => {
    const reg_number = req.params.reg_number;
    const studentQuery = 'SELECT student_name, fee_status FROM students WHERE reg_number = ?';
    
    db.query(studentQuery, [reg_number], (err, studentResults) => {
        if (err) return res.status(500).json({ error: 'Database error', message: err.message });
        
        if (studentResults.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const student = studentResults[0];
        const logsQuery = 'SELECT access_time, status FROM access_logs WHERE reg_number = ? ORDER BY access_time DESC LIMIT 15';
        
        db.query(logsQuery, [reg_number], (err, logsResults) => {
            if (err) return res.status(500).json({ error: 'Database error', message: err.message });
            
            res.json({
                name: student.student_name,
                fee_status: student.fee_status,
                logs: logsResults
            });
        });
    });
});

// Port binding for Render deployment
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Backend Ready: Server running on port ${PORT}`);
});
