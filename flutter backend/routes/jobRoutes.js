const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");
const { 
    sendJobOTP, 
    verifyAndSubmitJob, 
    getCustomerJobs, 
    editJob, 
    deleteJob, 
    getAvailableJobs, 
    getOngoingJobs,
    getJobCategories,
    getJobWorks
} = require("../controllers/jobController");

// Customer routes
router.post("/send-otp", auth, authorizeRoles('customer'), sendJobOTP);
// upload.array('files', 3) allows up to 3 files with field name 'files'
router.post("/verify-otp-submit", auth, authorizeRoles('customer'), upload.array('files', 3), verifyAndSubmitJob);
router.get("/my-jobs", auth, authorizeRoles('customer'), getCustomerJobs);
router.put("/:jobId", auth, authorizeRoles('customer'), editJob);
router.delete("/:jobId", auth, authorizeRoles('customer'), deleteJob);

// Ongoing jobs for both roles
router.get("/ongoing", auth, getOngoingJobs);

// Vendor routes
router.get("/available", auth, authorizeRoles('vendor'), getAvailableJobs);

// Public listing routes
router.get("/categories", getJobCategories);
router.get("/job-works/:categoryId", getJobWorks);

module.exports = router;
