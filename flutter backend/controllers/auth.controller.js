const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const generateOTP = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
};

const signToken = (user) => {
    return jwt.sign(
        { id: user.id, phone: user.phone, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
};

const signup = async (req, res) => {
    try {
        const { name, trade_name, email, phone, user_type } = req.body;

        if (!name || !phone || !user_type) {
            return res.status(400).json({ success: false, message: "Name, phone, and user type are required" });
        }

        const VALID_USER_TYPES = ["customer", "vendor", "both", "admin"];
        if (!VALID_USER_TYPES.includes(user_type)) {
            return res.status(400).json({ success: false, message: "Invalid user type" });
        }

        // Generate username if not provided or just use phone/email
        const username = req.body.username || phone;

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Check if user exists
            const existing = await client.query("SELECT id FROM users WHERE phone = $1", [phone]);
            if (existing.rowCount > 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({ success: false, message: "Phone number already registered" });
            }

            const result = await client.query(
                `INSERT INTO users (name, trade_name, username, email, phone, user_type) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [name, trade_name, username, email, phone, user_type]
            );

            const user = result.rows[0];
            const otp = generateOTP();
            const expiry = new Date(Date.now() + 5 * 60 * 1000);

            await client.query(
                "INSERT INTO otp_verifications (user_id, otp_code, otp_expiry) VALUES ($1, $2, $3)",
                [user.id, otp, expiry]
            );

            await client.query("COMMIT");

            console.log(`[SIGNUP OTP] Phone: ${phone} -> OTP: ${otp}`);

            return res.status(201).json({
                success: true,
                message: "User registered. Please verify OTP.",
                otp // simulate SMS
            });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("SIGNUP ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }

        const result = await pool.query(
            `SELECT u.*, o.id as otp_id, o.otp_expiry, o.is_verified as otp_verified
             FROM users u
             JOIN otp_verifications o ON u.id = o.user_id
             WHERE u.phone = $1 AND o.otp_code = $2 AND o.is_verified = false
             ORDER BY o.created_at DESC LIMIT 1`,
            [phone, otp]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ success: false, message: "Invalid OTP or phone" });
        }

        const user = result.rows[0];

        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ success: false, message: "OTP expired" });
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // Mark OTP as verified
            await client.query("UPDATE otp_verifications SET is_verified = true WHERE id = $1", [user.otp_id]);

            // Mark user as verified
            await client.query("UPDATE users SET is_verified = true WHERE id = $1", [user.id]);

            await client.query("COMMIT");

            const token = signToken(user);

            // Remove sensitive fields
            delete user.otp_id;
            delete user.otp_expiry;
            delete user.otp_verified;
            delete user.otp_code;

            return res.json({
                success: true,
                message: "OTP verified successfully",
                token,
                user
            });
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("VERIFY OTP ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const login = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });

        const result = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = result.rows[0];
        const otp = generateOTP();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            "INSERT INTO otp_verifications (user_id, otp_code, otp_expiry) VALUES ($1, $2, $3)",
            [user.id, otp, expiry]
        );

        console.log(`[LOGIN OTP] Phone: ${phone} -> OTP: ${otp}`);

        return res.json({
            success: true,
            message: "OTP sent successfully",
            otp // simulate SMS
        });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { signup, verifyOTP, login };
