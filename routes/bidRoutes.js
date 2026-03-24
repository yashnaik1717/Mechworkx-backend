const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { submitBid, getVendorBids, getJobBids, awardBid } = require("../controllers/bidController");

// Vendor bidding
router.post("/submit", auth, authorizeRoles('vendor'), submitBid);
router.get("/my-bids", auth, authorizeRoles('vendor'), getVendorBids);

// Customer awarding
router.get("/job/:jobId", auth, authorizeRoles('customer'), getJobBids);
router.post("/award", auth, authorizeRoles('customer'), awardBid);

module.exports = router;
