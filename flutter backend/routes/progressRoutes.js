const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");
const { acceptAward, updateProgress, updateShipmentStatus } = require("../controllers/progressController");

router.post("/:jobId/accept", auth, authorizeRoles('vendor'), acceptAward);
router.post("/:jobId/update", auth, authorizeRoles('vendor'), upload.single('file'), updateProgress);
router.post("/:jobId/shipment", auth, authorizeRoles('vendor'), upload.single('file'), updateShipmentStatus);

module.exports = router;
