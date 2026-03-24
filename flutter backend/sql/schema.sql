-- ==========================================================
-- MeckWorkx Database Schema (PostgreSQL)
-- ==========================================================

-- 1. Cleanup: Restart from scratch
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS job_progress CASCADE;
DROP TABLE IF EXISTS job_invitations CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS job_files CASCADE;
DROP TABLE IF EXISTS job_works CASCADE;
DROP TABLE IF EXISTS job_category_mapping CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_categories CASCADE;
DROP TABLE IF EXISTS otp_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    user_type VARCHAR(50) DEFAULT 'customer' CHECK (user_type IN ('customer', 'vendor', 'both', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. OTP Verifications
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    otp_expiry TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Job Categories
CREATE TABLE job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE
);

-- 6. Job Works (Sub-categories/Activities)
CREATE TABLE job_works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES job_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

-- 7. Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    material_type VARCHAR(255),
    quantity INTEGER,
    budget DECIMAL(12, 2),
    deadline DATE,
    job_type VARCHAR(20) DEFAULT 'public' CHECK (job_type IN ('public', 'private')),
    delivery_location TEXT,
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(20),
    trade_name VARCHAR(255),
    trade_address TEXT,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    material_provider VARCHAR(50) CHECK (material_provider IN ('customer', 'vendor', 'both')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'awarded', 'active', 'on_hold', 'completed', 'cancelled')),
    awarded_vendor_id UUID REFERENCES users(id),
    job_work_id UUID REFERENCES job_works(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Many-to-Many: Job - Categories (Optional if 1 category per job, but keeping for flexibility)
CREATE TABLE job_category_mapping (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    category_id UUID REFERENCES job_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, category_id)
);

-- 9. Bids Table
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bid_amount DECIMAL(12, 2) NOT NULL,
    delivery_details TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, vendor_id)
);

-- 10. Job Invitations (For Private Jobs)
CREATE TABLE job_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Job Progress / Milestones
CREATE TABLE job_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status_percent INTEGER CHECK (status_percent IN (25, 50, 75, 100)),
    notes TEXT,
    inspection_sheet_url TEXT, -- Required for 100% completion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Messages (Simplified)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Job Files
CREATE TABLE job_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    file_type VARCHAR(50) CHECK (file_type IN ('datafile', 'inspection', 'shipment', 'other')),
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Seed Initial Data
INSERT INTO job_categories (name) VALUES 
('Machining'), ('Fabrication'), ('3D Printing'), ('Casting'), ('Injection Molding');

-- Seed some job works for Machining
INSERT INTO job_works (category_id, name) VALUES 
((SELECT id FROM job_categories WHERE name='Machining'), 'CNC Turning'),
((SELECT id FROM job_categories WHERE name='Machining'), 'VMC Milling'),
((SELECT id FROM job_categories WHERE name='Machining'), 'Laser Cutting');
