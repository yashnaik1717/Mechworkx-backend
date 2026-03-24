const { Pool } = require("pg");

// Supabase requires individual params to correctly handle special chars in passwords.
// It also requires SSL and uses the pooler on port 5432 (session) or 6543 (transaction).
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on("connect", () => console.log("✅ PostgreSQL connected (Supabase)"));
pool.on("error", (err) => console.error("❌ DB pool error:", err.message));

module.exports = pool;
