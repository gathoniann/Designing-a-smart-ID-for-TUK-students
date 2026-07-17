-- ============================================================
-- TUK Smart ID System — Supabase PostgreSQL Schema v2
-- Run this in the Supabase SQL Editor to set up your tables
-- ============================================================

-- Students table (with password and wallet_balance columns)
CREATE TABLE IF NOT EXISTS students (
    id             SERIAL PRIMARY KEY,
    student_name   VARCHAR(255) NOT NULL,
    reg_number     VARCHAR(50)  NOT NULL UNIQUE,
    nfc_uid        VARCHAR(100) NOT NULL UNIQUE,
    fee_status     BOOLEAN      NOT NULL DEFAULT false,  -- true = cleared, false = pending
    password       VARCHAR(255) NOT NULL DEFAULT '$2b$10$1nwheIUEqlkQ25wURFoTduKgvq2Va0lifir4K83Z.yBOLjXmF8a8S', -- hashed 'student123' (bcrypt)
    program        VARCHAR(255) NOT NULL DEFAULT 'BSc Information Science',
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    allowed_facilities VARCHAR(255) NOT NULL DEFAULT 'Main Gate, Main Library',
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id           SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    reg_number   VARCHAR(50)  NOT NULL,
    status       VARCHAR(50)  NOT NULL,  -- 'Access Granted' or 'Access Denied'
    facility     VARCHAR(100) NOT NULL DEFAULT 'Main Gate',
    access_time  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Administrators table
CREATE TABLE IF NOT EXISTS admins (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL DEFAULT '$2b$10$lvCJZNd4.bUrnowp8SIQN.3RmyEfd95JKrK1vD1ojyv8PJ.VvwhpK', -- hashed 'admin123' (bcrypt)
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    reg_number     VARCHAR(50)  NOT NULL REFERENCES students(reg_number) ON DELETE CASCADE,
    service_point  VARCHAR(100) NOT NULL, -- e.g., 'Student Cafeteria', 'Library Printing'
    amount         DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'DEBIT', -- 'DEBIT' for spending, 'CREDIT' for top-ups
    transaction_time TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Upgrading schema fields dynamically (safe to run on existing tables)
ALTER TABLE students ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT '$2b$10$1nwheIUEqlkQ25wURFoTduKgvq2Va0lifir4K83Z.yBOLjXmF8a8S';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program VARCHAR(255) NOT NULL DEFAULT 'BSc Information Science';
ALTER TABLE students ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS allowed_facilities VARCHAR(255) NOT NULL DEFAULT 'Main Gate, Main Library';
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS facility VARCHAR(100) NOT NULL DEFAULT 'Main Gate';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_nfc_uid    ON students(nfc_uid);
CREATE INDEX IF NOT EXISTS idx_students_reg_number ON students(reg_number);
CREATE INDEX IF NOT EXISTS idx_access_logs_reg     ON access_logs(reg_number);
CREATE INDEX IF NOT EXISTS idx_transactions_reg     ON transactions(reg_number);

-- ============================================================
-- Sample test data (remove before going live)
-- All students have default password: student123
-- ============================================================
INSERT INTO students (student_name, reg_number, nfc_uid, fee_status, password, program, wallet_balance, allowed_facilities) VALUES
    ('Jane Wanjiku',   'AIIM/00476/2022', 'ABC12345', true,  '$2b$10$1nwheIUEqlkQ25wURFoTduKgvq2Va0lifir4K83Z.yBOLjXmF8a8S', 'BSc Information Science', 550.00, 'Main Gate, Main Library'),
    ('John Kamau',     'SBFE/02145/2022', 'DEF67890', false, '$2b$10$1nwheIUEqlkQ25wURFoTduKgvq2Va0lifir4K83Z.yBOLjXmF8a8S', 'BSc Computer Science', 120.00, 'Main Gate, Main Library, Computer Science Lab'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'GHI11223', true,  '$2b$10$1nwheIUEqlkQ25wURFoTduKgvq2Va0lifir4K83Z.yBOLjXmF8a8S', 'BSc Software Engineering', 1500.00, 'Main Gate, Main Library, Computer Science Lab, Engineering Lab')
ON CONFLICT (reg_number) DO UPDATE SET 
    password = EXCLUDED.password,
    fee_status = EXCLUDED.fee_status,
    nfc_uid = EXCLUDED.nfc_uid,
    program = EXCLUDED.program,
    student_name = EXCLUDED.student_name,
    wallet_balance = EXCLUDED.wallet_balance,
    allowed_facilities = EXCLUDED.allowed_facilities;

-- Seed administrators
INSERT INTO admins (username, password) VALUES 
    ('admin', '$2b$10$lvCJZNd4.bUrnowp8SIQN.3RmyEfd95JKrK1vD1ojyv8PJ.VvwhpK')
ON CONFLICT (username) DO UPDATE SET 
    password = EXCLUDED.password;

-- Seed initial transactions
-- First, let's insert credit transactions matching their initial wallet_balances
INSERT INTO transactions (reg_number, service_point, amount, transaction_type, transaction_time)
SELECT 'AIIM/00476/2022', 'Online Top-Up', 550.00, 'CREDIT', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE reg_number = 'AIIM/00476/2022');

INSERT INTO transactions (reg_number, service_point, amount, transaction_type, transaction_time)
SELECT 'SBFE/02145/2022', 'Online Top-Up', 120.00, 'CREDIT', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE reg_number = 'SBFE/02145/2022');

INSERT INTO transactions (reg_number, service_point, amount, transaction_type, transaction_time)
SELECT 'ABBQ/00001/2021', 'Online Top-Up', 1500.00, 'CREDIT', NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE reg_number = 'ABBQ/00001/2021');

-- Seed historical access logs for the last 3 days
INSERT INTO access_logs (student_name, reg_number, status, facility, access_time)
SELECT name, reg, status, facility, time FROM (VALUES
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Granted', 'Main Gate', NOW() - INTERVAL '1 hour'),
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Granted', 'Main Library', NOW() - INTERVAL '1.5 hours'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Main Gate', NOW() - INTERVAL '2 hours'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Computer Science Lab', NOW() - INTERVAL '2.5 hours'),
    ('John Kamau',     'SBFE/02145/2022', 'Access Denied: Fee Balance', 'Main Gate', NOW() - INTERVAL '3 hours'),
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Denied: Unauthorized Facility', 'Computer Science Lab', NOW() - INTERVAL '4 hours'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Engineering Lab', NOW() - INTERVAL '6 hours'),
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Granted', 'Main Gate', NOW() - INTERVAL '12 hours'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Main Gate', NOW() - INTERVAL '14 hours'),
    ('John Kamau',     'SBFE/02145/2022', 'Access Denied: Fee Balance', 'Main Library', NOW() - INTERVAL '1 day'),
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Granted', 'Main Library', NOW() - INTERVAL '1.2 days'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Main Gate', NOW() - INTERVAL '1.5 days'),
    ('John Kamau',     'SBFE/02145/2022', 'Access Denied: Fee Balance', 'Main Gate', NOW() - INTERVAL '1.8 days'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Main Library', NOW() - INTERVAL '2 days'),
    ('Jane Wanjiku',   'AIIM/00476/2022', 'Access Granted', 'Main Gate', NOW() - INTERVAL '2.2 days'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'Access Granted', 'Main Gate', NOW() - INTERVAL '2.5 days')
) AS tmp(name, reg, status, facility, time)
WHERE NOT EXISTS (SELECT 1 FROM access_logs);

-- Seed historical transactions
INSERT INTO transactions (reg_number, service_point, amount, transaction_type, transaction_time)
SELECT reg, service, amt, type, time FROM (VALUES
    ('AIIM/00476/2022', 'Student Cafeteria', 80.00, 'DEBIT', NOW() - INTERVAL '3 hours'),
    ('ABBQ/00001/2021', 'Student Cafeteria', 120.00, 'DEBIT', NOW() - INTERVAL '5 hours'),
    ('AIIM/00476/2022', 'Library Printing', 20.00, 'DEBIT', NOW() - INTERVAL '1 day'),
    ('ABBQ/00001/2021', 'Campus Laundry', 40.00, 'DEBIT', NOW() - INTERVAL '1.5 days'),
    ('SBFE/02145/2022', 'TUK Bookshop', 50.00, 'DEBIT', NOW() - INTERVAL '2 days'),
    ('AIIM/00476/2022', 'Online M-Pesa', 200.00, 'CREDIT', NOW() - INTERVAL '2.1 days'),
    ('ABBQ/00001/2021', 'Online Card', 500.00, 'CREDIT', NOW() - INTERVAL '2.8 days')
) AS tmp(reg, service, amt, type, time)
WHERE (SELECT COUNT(*) FROM transactions) <= 3;



