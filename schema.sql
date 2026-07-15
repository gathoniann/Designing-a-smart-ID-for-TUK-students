-- ============================================================
-- TUK Smart ID System — Supabase PostgreSQL Schema v2
-- Run this in the Supabase SQL Editor to set up your tables
-- ============================================================

-- Students table (with password column for student login)
CREATE TABLE IF NOT EXISTS students (
    id           SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    reg_number   VARCHAR(50)  NOT NULL UNIQUE,
    nfc_uid      VARCHAR(100) NOT NULL UNIQUE,
    fee_status   BOOLEAN      NOT NULL DEFAULT false,  -- true = cleared, false = pending
    password     VARCHAR(255) NOT NULL DEFAULT 'student123', -- plain text for prototype; use bcrypt in production
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id           SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    reg_number   VARCHAR(50)  NOT NULL,
    status       VARCHAR(50)  NOT NULL,  -- 'Access Granted' or 'Access Denied'
    access_time  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Add password column if upgrading from v1 schema (safe to run on existing tables)
ALTER TABLE students ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'student123';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_students_nfc_uid    ON students(nfc_uid);
CREATE INDEX IF NOT EXISTS idx_students_reg_number ON students(reg_number);
CREATE INDEX IF NOT EXISTS idx_access_logs_reg     ON access_logs(reg_number);

-- ============================================================
-- Sample test data (remove before going live)
-- All students have default password: student123
-- ============================================================
INSERT INTO students (student_name, reg_number, nfc_uid, fee_status, password) VALUES
    ('Jane Wanjiku',   'AIIM/00476/2022', 'ABC12345', true,  'student123'),
    ('John Kamau',     'SBFE/02145/2022', 'DEF67890', false, 'student123'),
    ('Alice Akinyi',   'ABBQ/00001/2021', 'GHI11223', true,  'student123')
ON CONFLICT (reg_number) DO UPDATE SET password = EXCLUDED.password;
