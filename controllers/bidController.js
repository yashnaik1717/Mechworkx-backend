const pool = require("../config/db");

// ── VENDOR APIs ──

const submitBid = async (req, res) => {
    try {
        const { job_id, bid_amount, delivery_details } = req.body;
        const vendorId = req.user.id;

        if (!job_id || !bid_amount) {
            return res.status(400).json({ success: false, message: "Job ID and bid amount are required" });
        }

        // Check if job exists and is open
        const jobCheck = await pool.query("SELECT status, job_type FROM jobs WHERE id = $1", [job_id]);
        if (jobCheck.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        if (jobCheck.rows[0].status !== 'open') return res.status(400).json({ success: false, message: "Job is no longer open for bidding" });

        // If private, ensure invited
        if (jobCheck.rows[0].job_type === 'private') {
            const inviteCheck = await pool.query("SELECT status FROM job_invitations WHERE job_id = $1 AND vendor_id = $2", [job_id, vendorId]);
            if (inviteCheck.rowCount === 0) return res.status(403).json({ success: false, message: "You are not invited to this private job" });
        }

        // Insert or update bid
        const result = await pool.query(
            `INSERT INTO bids (job_id, vendor_id, bid_amount, delivery_details) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (job_id, vendor_id) DO UPDATE SET 
                bid_amount = EXCLUDED.bid_amount, 
                delivery_details = EXCLUDED.delivery_details, 
                updated_at = CURRENT_TIMESTAMP 
             RETURNING *`,
            [job_id, vendorId, bid_amount, delivery_details]
        );

        return res.status(201).json({ success: true, message: "Bid submitted successfully", bid: result.rows[0] });
    } catch (err) {
        console.error("SUBMIT BID ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const getVendorBids = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const result = await pool.query(
            `SELECT b.*, j.title as job_title, j.status as job_status 
             FROM bids b 
             JOIN jobs j ON b.job_id = j.id 
             WHERE b.vendor_id = $1 
             ORDER BY b.created_at DESC`,
            [vendorId]
        );
        return res.json({ success: true, bids: result.rows });
    } catch (err) {
        console.error("GET VENDOR BIDS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ── CUSTOMER APIs ──

const getJobBids = async (req, res) => {
    try {
        const { jobId } = req.params;
        const customerId = req.user.id;

        // Ensure ownership
        const jobCheck = await pool.query("SELECT id FROM jobs WHERE id = $1 AND customer_id = $2", [jobId, customerId]);
        if (jobCheck.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });

        const result = await pool.query(
            `SELECT b.*, u.name as vendor_name, u.trade_name as vendor_trade_name 
             FROM bids b 
             JOIN users u ON b.vendor_id = u.id 
             WHERE b.job_id = $1 
             ORDER BY b.bid_amount ASC`,
            [jobId]
        );

        return res.json({ success: true, count: result.rowCount, bids: result.rows });
    } catch (err) {
        console.error("GET JOB BIDS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const awardBid = async (req, res) => {
    const client = await pool.connect();
    try {
        const { bid_id } = req.body;
        const customerId = req.user.id;

        if (!bid_id) return res.status(400).json({ success: false, message: "Bid ID is required" });

        // Get bid and check job ownership
        const bidResult = await client.query(
            `SELECT b.*, j.customer_id, j.status as job_status 
             FROM bids b 
             JOIN jobs j ON b.job_id = j.id 
             WHERE b.id = $1`,
            [bid_id]
        );

        if (bidResult.rowCount === 0) return res.status(404).json({ success: false, message: "Bid not found" });
        const bid = bidResult.rows[0];

        if (bid.customer_id !== customerId) return res.status(403).json({ success: false, message: "Unauthorized" });
        if (bid.job_status !== 'open') return res.status(400).json({ success: false, message: `Job is already ${bid.job_status}` });

        await client.query("BEGIN");

        // 1. Update selected bid to 'accepted'
        await client.query("UPDATE bids SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [bid_id]);

        // 2. Update other bids for this job to 'rejected'
        await client.query("UPDATE bids SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE job_id = $1 AND id != $2", [bid.job_id, bid_id]);

        // 3. Update job to 'awarded'
        const jobUpdate = await client.query(
            "UPDATE jobs SET status = 'awarded', awarded_vendor_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
            [bid.vendor_id, bid.job_id]
        );

        await client.query("COMMIT");

        return res.json({ success: true, message: "Bid awarded successfully", job: jobUpdate.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("AWARD BID ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

module.exports = { submitBid, getVendorBids, getJobBids, awardBid };
