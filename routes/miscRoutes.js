const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getCustomerDashboard, getVendorDashboard } = require("../controllers/dashboardController");
const { listVendors } = require("../controllers/vendorController");
const { getAllUsers, getAllJobs, addCategory } = require("../controllers/adminController");

// Dashboards
router.get("/customer", auth, authorizeRoles('customer'), getCustomerDashboard);
router.get("/vendor", auth, authorizeRoles('vendor'), getVendorDashboard);

// Vendor list (for customer invitations)
router.get("/vendors", auth, listVendors);

// Admin routes
router.get("/admin/users", auth, authorizeRoles('admin'), getAllUsers);
router.get("/admin/jobs", auth, authorizeRoles('admin'), getAllJobs);
router.post("/admin/categories", auth, authorizeRoles('admin'), addCategory);

module.exports = router;
