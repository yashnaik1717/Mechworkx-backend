const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If you're deploying (Render/Heroku/etc.) you may need SSL:
  // ssl: { rejectUnauthorized: false },
});

module.exports = pool;
