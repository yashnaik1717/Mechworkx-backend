// Run this script once to add the job_number column to the jobs table
// Usage: node sql/migrate_job_number.js
require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, 'add_job_number.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('✅ Migration completed: job_number column is ready');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}
run();
