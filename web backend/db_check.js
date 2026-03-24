const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.qcducpjqldbaziamgjww:0RdfEC0Iy34N1FKV@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres' });
pool.query('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 5').then(res => {
  console.log('JOBS:', res.rows.map(r => ({id: r.id, created: r.created_at})));
  return pool.query('SELECT * FROM otp_verifications ORDER BY created_at DESC LIMIT 5');
}).then(res => {
  console.log('OTPS:', res.rows.map(r => ({code: r.otp_code, verified: r.is_verified, created: r.created_at})));
  process.exit(0);
}).catch(console.error);
