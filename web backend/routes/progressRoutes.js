const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { acceptAward, updateProgress, updateShipmentStatus } = require("../controllers/progressController");

router.post("/:jobId/accept", auth, authorizeRoles('vendor'), acceptAward);
router.post("/:jobId/update", auth, authorizeRoles('vendor'), updateProgress);
router.post("/:jobId/shipment", auth, authorizeRoles('vendor'), updateShipmentStatus);

module.exports = router;
