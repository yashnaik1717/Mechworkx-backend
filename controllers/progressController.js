const pool = require("../config/db");

const acceptAward = async (req, res) => {
    try {
        const { jobId } = req.params;
        const vendorId = req.user.id;

        // Check if job is awarded to this vendor
        const jobResult = await pool.query(
            "SELECT status, awarded_vendor_id FROM jobs WHERE id = $1",
            [jobId]
        );

        if (jobResult.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        const job = jobResult.rows[0];

        if (job.status !== 'awarded') return res.status(400).json({ success: false, message: "Job is not in awarded status" });
        if (job.awarded_vendor_id !== vendorId) return res.status(403).json({ success: false, message: "This job was not awarded to you" });

        // Update to active
        await pool.query(
            "UPDATE jobs SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [jobId]
        );

        return res.json({ success: true, message: "Award accepted. Job is now active." });
    } catch (err) {
        console.error("ACCEPT AWARD ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const updateProgress = async (req, res) => {
    const client = await pool.connect();
    try {
        const { jobId } = req.params;
        const { status_percent, notes, inspection_sheet_url } = req.body;
        const vendorId = req.user.id;

        if (!status_percent) return res.status(400).json({ success: false, message: "Status percent is required" });

        // Verify vendor assignment
        const jobResult = await client.query(
            "SELECT status, awarded_vendor_id FROM jobs WHERE id = $1",
            [jobId]
        );

        if (jobResult.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        const job = jobResult.rows[0];

        if (job.status !== 'active' && status_percent !== 100) {
            return res.status(400).json({ success: false, message: "Only active jobs can have progress updates" });
        }
        if (job.awarded_vendor_id !== vendorId) return res.status(403).json({ success: false, message: "You are not the assigned vendor" });

        if (status_percent === 100 && !inspection_sheet_url) {
            return res.status(400).json({ success: false, message: "Inspection sheet is required for 100% completion" });
        }

        await client.query("BEGIN");

        // 1. Log progress
        await client.query(
            `INSERT INTO job_progress (job_id, status_percent, notes, inspection_sheet_url) 
             VALUES ($1, $2, $3, $4)`,
            [jobId, status_percent, notes, inspection_sheet_url]
        );

        // 2. If 100%, update job status
        if (status_percent === 100) {
            await client.query(
                "UPDATE jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [jobId]
            );

            // Log file if inspection sheet provided
            if (inspection_sheet_url) {
                await client.query(
                    "INSERT INTO job_files (job_id, file_type, file_url) VALUES ($1, 'inspection', $2)",
                    [jobId, inspection_sheet_url]
                );
            }
        }

        await client.query("COMMIT");

        return res.json({ success: true, message: `Progress updated to ${status_percent}%` });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("UPDATE PROGRESS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

const updateShipmentStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { shipment_status, file_url } = req.body; // Ready for Shipment, Shipped, Delivered
        const vendorId = req.user.id;

        const VALID_STATUSES = ['Ready for Shipment', 'Shipped', 'Delivered'];
        if (!VALID_STATUSES.includes(shipment_status)) {
            return res.status(400).json({ success: false, message: "Invalid shipment status" });
        }

        // Check completion
        const jobCheck = await pool.query(
            "SELECT status, awarded_vendor_id FROM jobs WHERE id = $1",
            [jobId]
        );

        if (jobCheck.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        if (jobCheck.rows[0].status !== 'completed' && jobCheck.rows[0].status !== 'active') {
            return res.status(400).json({ success: false, message: "Job must be active or completed to update shipment" });
        }
        if (jobCheck.rows[0].awarded_vendor_id !== vendorId) return res.status(403).json({ success: false, message: "Unauthorized" });

        // Log shipment file if provided
        if (file_url) {
            await pool.query(
                "INSERT INTO job_files (job_id, file_type, file_url) VALUES ($1, 'shipment', $2)",
                [jobId, file_url]
            );
        }

        return res.json({ success: true, message: `Shipment status updated to: ${shipment_status}` });
    } catch (err) {
        console.error("SHIPMENT UPDATE ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { acceptAward, updateProgress, updateShipmentStatus };
