const pool = require("../config/db");

const getCustomerDashboard = async (req, res) => {
    try {
        const customerId = req.user.id;

        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_jobs,
                COUNT(*) FILTER (WHERE status = 'open') as open_jobs,
                COUNT(*) FILTER (WHERE status = 'active') as active_jobs,
                COUNT(*) FILTER (WHERE status = 'awarded') as awarded_jobs,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
                COUNT(*) FILTER (WHERE status = 'closed') as closed_jobs
             FROM jobs WHERE customer_id = $1`,
            [customerId]
        );

        return res.json({ success: true, metrics: result.rows[0] });
    } catch (err) {
        console.error("CUSTOMER DASHBOARD ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const getVendorDashboard = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // 1. Basic counts
        const statsResult = await pool.query(
            `SELECT 
                COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'active') as active_jobs,
                COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'awarded') as awarded_pending_accept,
                COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
                COUNT(DISTINCT b.id) as total_bids
             FROM jobs j
             LEFT JOIN bids b ON j.id = b.job_id AND b.vendor_id = $1
             WHERE j.awarded_vendor_id = $1 OR b.vendor_id = $1`,
            [vendorId]
        );

        // 2. Jobs grouped by category name
        const categoryResult = await pool.query(
            `SELECT c.name as category, COUNT(j.id) as job_count
             FROM jobs j
             JOIN job_category_mapping jcm ON j.id = jcm.job_id
             JOIN job_categories c ON jcm.category_id = c.id
             WHERE j.awarded_vendor_id = $1 OR j.id IN (SELECT job_id FROM bids WHERE vendor_id = $1)
             GROUP BY c.name`,
            [vendorId]
        );

        return res.json({
            success: true,
            metrics: statsResult.rows[0],
            categories: categoryResult.rows
        });
    } catch (err) {
        console.error("VENDOR DASHBOARD ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getCustomerDashboard, getVendorDashboard };
