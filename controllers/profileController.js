const pool = require("../config/db");
const { createClient } = require('@supabase/supabase-js');
const jwt = require("jsonwebtoken");

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const signToken = (user) => {
    return jwt.sign(
        { id: user.id, phone: user.phone, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = result.rows[0];
        return res.json({ success: true, user: user });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const requestProfileUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const updateData = { ...req.body };
        
        // Handle photo upload if present (stored temporarily in updateData until verified)
        if (req.file) {
            // make sure bucket exists
            await supabase.storage.createBucket('user-profiles', { public: true }).catch(() => {});
            
            const uniqueName = `profile-${userId}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
                .from('user-profiles')
                .upload(uniqueName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('user-profiles').getPublicUrl(uniqueName);
            updateData.profile_image_url = publicUrlData.publicUrl;
        }

        const otp = String(Math.floor(1000 + Math.random() * 9000));
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Store pending update
        await pool.query(
            "INSERT INTO pending_profile_updates (user_id, new_data, otp_code, otp_expiry) VALUES ($1, $2, $3, $4)",
            [userId, JSON.stringify(updateData), otp, expiry]
        );

        console.log(`\n🔑 [PROFILE UPDATE OTP] User ID: ${userId} -> OTP: ${otp}\n`);

        return res.json({
            success: true,
            message: "OTP sent. Please verify to save changes.",
            otp // simulate SMS
        });
    } catch (err) {
        console.error("REQUEST PROFILE UPDATE ERROR STACK:", err.stack || err);
        return res.status(500).json({ success: false, message: "Server error", error: err.message, stack: err.stack });
    }
};

const verifyProfileUpdate = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        if (!otp) return res.status(400).json({ success: false, message: "OTP is required" });

        await client.query("BEGIN");

        // 1. Get the latest pending update for this user
        const result = await client.query(
            `SELECT * FROM pending_profile_updates 
             WHERE user_id = $1 AND otp_code = $2
             ORDER BY created_at DESC LIMIT 1`,
            [userId, otp]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        const pending = result.rows[0];
        if (new Date() > new Date(pending.otp_expiry)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "OTP expired" });
        }

        const data = pending.new_data;

        // 2. Perform the actual update on the users table
        // We use COALESCE to keep existing data if a field wasn't provided in the update
        const updateQuery = `
            UPDATE users SET
                name = COALESCE($1, name),
                trade_name = COALESCE($2, trade_name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                profile_image_url = COALESCE($5, profile_image_url),
                gst_number = COALESCE($6, gst_number),
                company_size = COALESCE($7, company_size),
                year_established = COALESCE($8, year_established),
                annual_turnover = COALESCE($9, annual_turnover),
                iec_code = COALESCE($10, iec_code),
                billing_address = COALESCE($11, billing_address),
                city = COALESCE($12, city),
                pincode = COALESCE($13, pincode),
                bank_account_number = COALESCE($14, bank_account_number),
                bank_account_name = COALESCE($15, bank_account_name),
                ifsc_code = COALESCE($16, ifsc_code),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $17
            RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
            data.name || null,
            data.tradeName || data.trade_name || null,
            data.email || null,
            data.phone || null,
            data.profileImageUrl || data.profile_image_url || null,
            data.gstNumber || data.gst_number || null,
            data.companySize || data.company_size || null,
            data.yearEstablished || data.year_established || null,
            data.annualTurnover || data.annual_turnover || null,
            data.iecCode || data.iec_code || null,
            data.billingAddress || data.billing_address || null,
            data.city || null,
            data.pincode || null,
            data.bankAccountNumber || data.bank_account_number || null,
            data.bankAccountName || data.bank_account_name || null,
            data.ifscCode || data.ifsc_code || null,
            userId
        ]);

        const updatedUser = updateResult.rows[0];

        // 3. Clear pending updates
        await client.query("DELETE FROM pending_profile_updates WHERE user_id = $1", [userId]);

        await client.query("COMMIT");

        // Issue a fresh token in case phone/user info changed
        const newToken = signToken(updatedUser);

        return res.json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
            token: newToken
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("VERIFY PROFILE UPDATE ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

module.exports = { getProfile, requestProfileUpdate, verifyProfileUpdate };


