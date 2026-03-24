const pool = require("../config/db");

const listVendors = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, trade_name, phone, is_verified FROM users WHERE user_type = 'vendor' OR user_type = 'both' ORDER BY name ASC"
        );
        return res.json({ success: true, count: result.rowCount, vendors: result.rows });
    } catch (err) {
        console.error("LIST VENDORS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { listVendors };
