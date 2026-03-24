require('dotenv').config({ path: 'c:/MechWorkx-project/mechworkx-portal/backend/.env' });
const pool = require('c:/MechWorkx-project/mechworkx-portal/backend/config/db');

async function migrate() {
  const sql = `
    -- Add profile columns to users table
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS year_established VARCHAR(10);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_turnover VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS iec_code VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);

    -- Create pending updates table for OTP verification flow
    CREATE TABLE IF NOT EXISTS pending_profile_updates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        new_data JSONB NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        otp_expiry TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log("Starting database migration...");
    await pool.query(sql);
    console.log("✅ Migration successful: Profiles table and columns updated.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
