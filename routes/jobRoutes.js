const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { createJob, getCustomerJobs, getJobById, editJob, deleteJob, getAvailableJobs, sendJobOtp } = require("../controllers/jobController");

const multer = require("multer");

// Use memory storage so we can upload to Supabase directly
const upload = multer({ storage: multer.memoryStorage() });

// Customer routes
router.post("/send-otp", auth, authorizeRoles('customer', 'both'), sendJobOtp);
router.post("/create", auth, authorizeRoles('customer', 'both'), upload.fields([
    { name: 'datafile', maxCount: 1 },
    { name: 'inspection', maxCount: 1 },
    { name: 'other', maxCount: 10 }
]), createJob);
router.get("/my-jobs", auth, authorizeRoles('customer', 'both'), getCustomerJobs);
router.get("/:jobId", auth, getJobById);              // GET single job by UUID (used by detail view)
router.put("/:jobId", auth, authorizeRoles('customer', 'both'), upload.fields([
    { name: 'datafile', maxCount: 1 },
    { name: 'inspection', maxCount: 1 },
    { name: 'other', maxCount: 10 }
]), editJob);
router.delete("/:jobId", auth, authorizeRoles('customer', 'both'), deleteJob); // DELETE job

// Vendor routes
router.get("/available", auth, authorizeRoles('vendor', 'both'), getAvailableJobs);

module.exports = router;
