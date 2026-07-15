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
    password       VARCHAR(255) NOT NULL DEFAULT 'student123', -- plain text for prototype; use bcrypt in production
    program        VARCHAR(255) NOT NULL DEFAULT 'BSc Information Science',
    wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
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
    password    VARCHAR(255) NOT NULL DEFAULT 'admin123', -- plain text for prototype; use bcrypt in production
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
ALTER TABLE students ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'student123';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program VARCHAR(255) NOT NULL DEFAULT 'BSc Information Science';
ALTER TABLE students ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
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
INSERT INTO students (student_name, reg_number, nfc_uid, fee_status, password, program, wallet_balance) VALUES
    ('Jane Wanjiku',   'AIIM/00476/2022', 'ABC12345', true,  'student123', 'BSc Information Science', 550.00),
    ('John Kamau',     'SBFE/02145/2022', 'DEF67890', false, 'student123', 'BSc Computer Science', 120.00),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'GHI11223', true,  'student123', 'BSc Software Engineering', 1500.00)
ON CONFLICT (reg_number) DO UPDATE SET 
    password = EXCLUDED.password,
    fee_status = EXCLUDED.fee_status,
    nfc_uid = EXCLUDED.nfc_uid,
    program = EXCLUDED.program,
    student_name = EXCLUDED.student_name,
    wallet_balance = EXCLUDED.wallet_balance;

-- Seed administrators
INSERT INTO admins (username, password) VALUES 
    ('admin', 'admin123')
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



