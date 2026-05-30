-- ============================================================
-- TUK Smart ID System — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to set up your tables
-- ============================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id          SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    reg_number   VARCHAR(50)  NOT NULL UNIQUE,
    nfc_uid      VARCHAR(100) NOT NULL UNIQUE,
    fee_status   BOOLEAN      NOT NULL DEFAULT false,  -- true = cleared, false = pending
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

-- Index for fast lookup by nfc_uid
CREATE INDEX IF NOT EXISTS idx_students_nfc_uid ON students(nfc_uid);

-- Index for fast lookup by reg_number in logs
CREATE INDEX IF NOT EXISTS idx_access_logs_reg_number ON access_logs(reg_number);

-- ============================================================
-- Sample test data (remove before going live)
-- ============================================================
INSERT INTO students (student_name, reg_number, nfc_uid, fee_status) VALUES
    ('Jane Wanjiku',   'TUK/2021/001', 'ABC12345', true),
    ('John Kamau',     'TUK/2022/045', 'DEF67890', false),
    ('Alice Akinyi',   'TUK/2020/112', 'GHI11223', true)
ON CONFLICT DO NOTHING;
