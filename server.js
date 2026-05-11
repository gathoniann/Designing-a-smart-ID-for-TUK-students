const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection utilizing the smart_id_system database [cite: 351]
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'smart_id_system', 
    port: 3306
});

db.connect(err => {
    if (err) return console.error('Database failed:', err);
    console.log('Backend Ready & Logging Active.');
});

// Verification route to handle real-time student identification [cite: 368]
app.post('/verify', (req, res) => {
    const { nfc_uid } = req.body;
    const findStudent = 'SELECT * FROM students WHERE nfc_uid = ?';
    
    db.query(findStudent, [nfc_uid], (err, results) => {
        if (err) return res.status(500).json({ status: 'Error', message: err.message });

        if (results.length > 0) {
            const student = results[0];
            // Check fee payment status as required by system logic [cite: 369]
            const status = (student.fee_status === 1) ? 'Access Granted' : 'Access Denied';
            
            // Record activity in a log for future reference [cite: 363, 370]
            const logQuery = 'INSERT INTO access_logs (student_name, reg_number, status) VALUES (?, ?, ?)';
            db.query(logQuery, [student.student_name, student.reg_number, status]);

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

// Step 2 Implementation: Optimized route to show recent logs
// We fetch the 10 most recent entries to maintain performance as the population grows [cite: 375, 379]
app.get('/logs', (req, res) => {
    db.query('SELECT * FROM access_logs ORDER BY access_time DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// New route for student portal: retrieve student profile and logs by registration number
app.get('/student/:reg_number', (req, res) => {
    const reg_number = req.params.reg_number;
    const studentQuery = 'SELECT student_name, fee_status FROM students WHERE reg_number = ?';
    
    db.query(studentQuery, [reg_number], (err, studentResults) => {
        if (err) return res.status(500).json({ error: 'Database error', message: err.message });
        
        if (studentResults.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const student = studentResults[0];
        const logsQuery = 'SELECT access_time, status FROM access_logs WHERE reg_number = ? ORDER BY access_time DESC';
        
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

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
