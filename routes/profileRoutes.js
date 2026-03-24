const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { getProfile, requestProfileUpdate, verifyProfileUpdate } = require("../controllers/profileController");
const multer = require("multer");

// Use memory storage for direct upload to Supabase
const upload = multer({ storage: multer.memoryStorage() });

// Fetch current user's profile
router.get("/me", auth, getProfile);

// Request an update with a 4-digit OTP (and optional photo)
router.post("/request-update", auth, upload.single('photo'), requestProfileUpdate);

// Verify the OTP and finalize the update
router.post("/verify-update", auth, verifyProfileUpdate);

module.exports = router;
