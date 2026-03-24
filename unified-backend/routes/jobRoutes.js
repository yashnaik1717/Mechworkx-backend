const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { 
    createJob, getCustomerJobs, getJobById, editJob, deleteJob, 
    getAvailableJobs, sendJobOtp, getOngoingJobs, getJobCategories, getJobWorks 
} = require("../controllers/jobController");

const multer = require("multer");

// Use memory storage so we can upload to Supabase directly
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for file uploads (supports both Flutter's 'files' and Web's distinct fields)
const jobUpload = upload.fields([
    { name: 'files', maxCount: 3 },      // Flutter field
    { name: 'datafile', maxCount: 1 },   // Web field
    { name: 'inspection', maxCount: 1 }, // Web field
    { name: 'other', maxCount: 10 }      // Web field
]);

// Customer routes
router.post("/send-otp", auth, authorizeRoles('customer', 'both'), sendJobOtp);
router.post("/create", auth, authorizeRoles('customer', 'both'), jobUpload, createJob);
router.post("/verify-otp-submit", auth, authorizeRoles('customer', 'both'), jobUpload, createJob); // Flutter alias
router.get("/my-jobs", auth, authorizeRoles('customer', 'both'), getCustomerJobs);
router.get("/ongoing", auth, getOngoingJobs); // Added for Flutter compatibility
router.get("/:jobId", auth, getJobById);              
router.put("/:jobId", auth, authorizeRoles('customer', 'both'), jobUpload, editJob);
router.delete("/:jobId", auth, authorizeRoles('customer', 'both'), deleteJob);

// Vendor routes
router.get("/available", auth, authorizeRoles('vendor', 'both'), getAvailableJobs);

// Public listing routes
router.get("/categories", getJobCategories); // Added for Flutter compatibility
router.get("/job-works/:categoryId", getJobWorks); // Added for Flutter compatibility

module.exports = router;
