const pool = require("../config/db");

const sendMessage = async (req, res) => {
    try {
        const { job_id, receiver_id, message } = req.body;
        const sender_id = req.user.id;

        if (!job_id || !receiver_id || !message) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const result = await pool.query(
            "INSERT INTO messages (job_id, sender_id, receiver_id, message) VALUES ($1, $2, $3, $4) RETURNING *",
            [job_id, sender_id, receiver_id, message]
        );

        return res.status(201).json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error("SEND MESSAGE ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const getJobMessages = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT m.*, u.name as sender_name 
             FROM messages m 
             JOIN users u ON m.sender_id = u.id 
             WHERE m.job_id = $1 
             AND (m.sender_id = $2 OR m.receiver_id = $2 OR $3 = 'admin')
             ORDER BY m.created_at ASC`,
            [jobId, userId, req.user.user_type]
        );

        return res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error("GET MESSAGES ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { sendMessage, getJobMessages };
