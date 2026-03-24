const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/authMiddleware");
const { sendMessage, getJobMessages } = require("../controllers/messageController");

router.post("/", auth, sendMessage);
router.get("/job/:jobId", auth, getJobMessages);

module.exports = router;
