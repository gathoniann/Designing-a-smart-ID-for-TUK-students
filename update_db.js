require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Initialize the database connection pool using env variables
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'smart_id_system',
    port:     parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false
});

async function runUpdate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    try {
        console.log('Reading schema.sql...');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Connecting to Supabase...');
        const client = await pool.connect();
        
        console.log('Executing SQL statements on Supabase...');
        await client.query(sql);
        console.log('SUCCESS: Schema applied.');

        console.log('Querying current students list...');
        const resStudents = await client.query('SELECT id, student_name, reg_number, nfc_uid, fee_status, program, wallet_balance, allowed_facilities FROM students');
        console.table(resStudents.rows);

        console.log('Querying current admins list...');
        const resAdmins = await client.query('SELECT id, username, password FROM admins');
        console.table(resAdmins.rows);

        console.log('Querying current transactions list...');
        const resTransactions = await client.query('SELECT transaction_id, reg_number, service_point, amount, transaction_type FROM transactions');
        console.table(resTransactions.rows);
        
        client.release();
    } catch (err) {
        console.error('ERROR updating Supabase:', err.message);
    } finally {
        await pool.end();
    }
}

runUpdate();

