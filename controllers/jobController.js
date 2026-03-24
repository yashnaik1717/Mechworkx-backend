const pool = require("../config/db");
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for OTP verification common between Create and Edit
const verifyOtpInternal = async (client, userId, otp) => {
    const otpResult = await client.query(
        `SELECT id, otp_expiry FROM otp_verifications
         WHERE user_id = $1 AND otp_code = $2 AND is_verified = false
         ORDER BY created_at DESC LIMIT 1`,
        [userId, otp]
    );

    if (otpResult.rowCount === 0) return { success: false, message: "Invalid OTP" };
    
    const otpRecord = otpResult.rows[0];
    if (new Date() > new Date(otpRecord.otp_expiry)) return { success: false, message: "OTP expired" };

    await client.query("UPDATE otp_verifications SET is_verified = true WHERE id = $1", [otpRecord.id]);
    return { success: true, id: otpRecord.id };
};

// ── CUSTOMER APIs ──

const createJob = async (req, res) => {
    console.log("=== CREATE JOB REQUEST ===");
    console.log("BODY:", req.body);
    console.log("FILES:", req.files ? Object.keys(req.files) : 'No files');
    const client = await pool.connect();
    try {
        const {
            title, description, material_type, quantity, budget,
            deadline, job_type, delivery_location, material_provider,
            category_id, invited_vendor_ids, otp
        } = req.body;
        const customerId = req.user.id;

        if (!title || !description || !job_type || !otp) {
            return res.status(400).json({ success: false, message: "Title, description, job type, and OTP are required" });
        }

        await client.query("BEGIN");

        // Verify OTP via helper
        const otpRes = await verifyOtpInternal(client, customerId, otp);
        if (!otpRes.success) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: otpRes.message });
        }

        const result = await client.query(
            `INSERT INTO jobs (
                customer_id, title, description, material_type, quantity, 
                budget, deadline, job_type, delivery_location, material_provider
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                customerId, title, description, material_type, quantity,
                budget, deadline, job_type, delivery_location, material_provider
            ]
        );

        const job = result.rows[0];

        // Link category if provided
        if (category_id) {
            await client.query(
                "INSERT INTO job_category_mapping (job_id, category_id) VALUES ($1, $2)",
                [job.id, category_id]
            );
        }

        // Handle private job invitations
        if (job_type === 'private' && Array.isArray(invited_vendor_ids)) {
            for (const vendorId of invited_vendor_ids) {
                await client.query(
                    "INSERT INTO job_invitations (job_id, vendor_id, status) VALUES ($1, $2, 'invited')",
                    [job.id, vendorId]
                );
            }
        }

        // Upload files to Supabase Memory Storage & db insertion
        if (req.files) {
            // make sure bucket exists
            await supabase.storage.createBucket('job-files', { public: true }).catch(() => {});

            const uploadTasks = [];
            
            const processUpload = async (fileObj, typeName) => {
                const uniqueName = `${Date.now()}-${job.id}-${fileObj.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('job-files')
                    .upload(uniqueName, fileObj.buffer, {
                        contentType: fileObj.mimetype,
                        upsert: false
                    });
                    
                if (uploadError) {
                    console.error("Supabase Upload Error:", uploadError);
                    throw uploadError;
                }

                const { data: publicUrlData } = supabase.storage.from('job-files').getPublicUrl(uniqueName);
                
                await client.query(
                    "INSERT INTO job_files (job_id, file_type, file_url) VALUES ($1, $2, $3)",
                    [job.id, typeName, publicUrlData.publicUrl]
                );
            };

            if (req.files['datafile']) {
                uploadTasks.push(processUpload(req.files['datafile'][0], 'datafile'));
            }
            if (req.files['inspection']) {
                uploadTasks.push(processUpload(req.files['inspection'][0], 'inspection'));
            }
            if (req.files['other']) {
                for (const fileObj of req.files['other']) {
                    uploadTasks.push(processUpload(fileObj, 'other'));
                }
            }

            await Promise.all(uploadTasks);
        }

        await client.query("COMMIT");

        return res.status(201).json({ success: true, message: "Job created successfully", job });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("CREATE JOB ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

const getCustomerJobs = async (req, res) => {
    try {
        const { status } = req.query; // all, open, active, awarded, closed
        const customerId = req.user.id;

        // Enrich with: job_number (serial display ID), user trade_name & phone,
        // category name from job_category_mapping, latest progress percent
        let query = `
            SELECT 
                j.*,
                j.job_number                          AS job_number,
                u.trade_name                          AS trade_name,
                u.phone                               AS phone,
                jc.name                               AS category,
                (
                    SELECT jp.status_percent
                    FROM job_progress jp
                    WHERE jp.job_id = j.id
                    ORDER BY jp.created_at DESC
                    LIMIT 1
                )                                     AS progress_percent,
                (
                    SELECT COALESCE(json_agg(json_build_object('file_type', jf.file_type, 'file_url', jf.file_url)), '[]')
                    FROM job_files jf
                    WHERE jf.job_id = j.id
                )                                     AS files
            FROM jobs j
            JOIN users u ON j.customer_id = u.id
            LEFT JOIN job_category_mapping jcm ON jcm.job_id = j.id
            LEFT JOIN job_categories jc ON jc.id = jcm.category_id
            WHERE j.customer_id = $1
        `;
        const params = [customerId];

        if (status && status !== 'all') {
            query += ` AND j.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY j.created_at DESC`;

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("GET CUSTOMER JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get a single job by its ID (UUID), enriched with all detail fields
const getJobById = async (req, res) => {
    try {
        const { jobId } = req.params;
        const customerId = req.user.id;

        const result = await pool.query(`
            SELECT
                j.*,
                j.job_number                                AS job_number,
                u.trade_name                                AS trade_name,
                u.phone                                     AS phone,
                u.name                                      AS customer_name,
                jc.name                                     AS category,
                (
                    SELECT jp.status_percent
                    FROM job_progress jp
                    WHERE jp.job_id = j.id
                    ORDER BY jp.created_at DESC
                    LIMIT 1
                )                                           AS progress_percent
            FROM jobs j
            JOIN users u ON j.customer_id = u.id
            LEFT JOIN job_category_mapping jcm ON jcm.job_id = j.id
            LEFT JOIN job_categories jc ON jc.id = jcm.category_id
            WHERE j.id = $1 AND j.customer_id = $2
        `, [jobId, customerId]);

        const job = result.rows[0];

        // Fetch files
        const files = await pool.query("SELECT file_type, file_url FROM job_files WHERE job_id = $1", [jobId]);
        job.files = files.rows;

        return res.json({ success: true, job });
    } catch (err) {
        console.error("GET JOB BY ID ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const editJob = async (req, res) => {
    const client = await pool.connect();
    try {
        const { jobId } = req.params;
        const customerId = req.user.id;
        const { title, description, quantity, budget, deadline, job_type, delivery_location, material_provider, otp } = req.body;

        await client.query("BEGIN");

        // 1. Verify OTP via helper
        const otpRes = await verifyOtpInternal(client, customerId, otp);
        if (!otpRes.success) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: otpRes.message });
        }

        // 2. Fetch current job
        const jobCheck = await client.query("SELECT status FROM jobs WHERE id = $1 AND customer_id = $2", [jobId, customerId]);
        if (jobCheck.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        if (jobCheck.rows[0].status !== 'open') return res.status(400).json({ success: false, message: "Only open jobs can be edited" });

        // 3. Update core job fields
        const query = `
            UPDATE jobs 
            SET title = $1, description = $2, quantity = $3, budget = $4, deadline = $5, 
                job_type = $6, delivery_location = $7, material_provider = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 AND customer_id = $10
            RETURNING *
        `;
        const result = await client.query(query, [
            title, description, quantity, budget, deadline, 
            job_type, delivery_location, material_provider, jobId, customerId
        ]);

        // 4. Handle NEW file uploads if provided
        if (req.files) {
            const uploadTasks = [];
            const processUpload = async (fileObj, type) => {
                const ext = fileObj.originalname.split('.').pop();
                const fileName = `${jobId}_${type}_${Date.now()}.${ext}`;
                const { error } = await supabase.storage
                    .from('job-files')
                    .upload(fileName, fileObj.buffer, { contentType: fileObj.mimetype, upsert: true });

                if (!error) {
                    const { data: publicData } = supabase.storage.from('job-files').getPublicUrl(fileName);
                    await client.query(
                        "INSERT INTO job_files (job_id, file_type, file_url) VALUES ($1, $2, $3)",
                        [jobId, type, publicData.publicUrl]
                    );
                }
            };

            if (req.files['datafile']) uploadTasks.push(processUpload(req.files['datafile'][0], 'datafile'));
            if (req.files['inspection']) uploadTasks.push(processUpload(req.files['inspection'][0], 'inspection'));
            if (req.files['other']) {
                for (const f of req.files['other']) uploadTasks.push(processUpload(f, 'other'));
            }
            await Promise.all(uploadTasks);
        }

        // 5. Delete OTP record (optional clean up)
        await client.query("DELETE FROM otp_verifications WHERE id = $1", [otpRes.id]);

        await client.query("COMMIT");
        return res.json({ success: true, message: "Job updated successfully", job: result.rows[0] });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("EDIT JOB ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

const deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const customerId = req.user.id;

        // Verify ownership
        const jobCheck = await pool.query(
            "SELECT status FROM jobs WHERE id = $1 AND customer_id = $2",
            [jobId, customerId]
        );
        if (jobCheck.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Hard delete — remove from DB
        await pool.query("DELETE FROM jobs WHERE id = $1 AND customer_id = $2", [jobId, customerId]);

        return res.json({ success: true, message: "Job deleted successfully" });
    } catch (err) {
        console.error("DELETE JOB ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ── VENDOR APIs ──

const getAvailableJobs = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Public jobs AND private jobs where invited
        const query = `
            SELECT j.*, j.job_number, u.trade_name, u.phone, jc.name AS category
            FROM jobs j
            JOIN users u ON j.customer_id = u.id
            LEFT JOIN job_category_mapping jcm ON jcm.job_id = j.id
            LEFT JOIN job_categories jc ON jc.id = jcm.category_id
            LEFT JOIN job_invitations ji ON j.id = ji.job_id AND ji.vendor_id = $1
            WHERE j.status = 'open'
            AND (j.job_type = 'public' OR ji.vendor_id IS NOT NULL)
            ORDER BY j.created_at DESC
        `;

        const result = await pool.query(query, [vendorId]);
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("GET AVAILABLE JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const sendJobOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const otp = String(Math.floor(1000 + Math.random() * 9000));
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            "INSERT INTO otp_verifications (user_id, otp_code, otp_expiry) VALUES ($1, $2, $3)",
            [userId, otp, expiry]
        );

        console.log(`[QUOTE OTP] User ID: ${userId} -> OTP: ${otp}`);

        return res.json({ success: true, message: "OTP sent successfully", otp });
    } catch (err) {
        console.error("SEND JOB OTP ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { createJob, getCustomerJobs, getJobById, editJob, deleteJob, getAvailableJobs, sendJobOtp };
