const pool = require("../config/db");

const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        return res.json({ success: true, count: result.rowCount, users: result.rows });
    } catch (err) {
        console.error("ADMIN GET USERS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const getAllJobs = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT j.*, u.name as customer_name FROM jobs j JOIN users u ON j.customer_id = u.id ORDER BY j.created_at DESC"
        );
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("ADMIN GET JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Category name required" });

        const result = await pool.query("INSERT INTO job_categories (name) VALUES ($1) RETURNING *", [name]);
        return res.status(201).json({ success: true, category: result.rows[0] });
    } catch (err) {
        console.error("ADMIN ADD CATEGORY ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getAllUsers, getAllJobs, addCategory };
