-- MeckWorkx Migration: Add address, city, pincode to jobs table
-- Run this if you already have the database set up and don't want to reset it.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
