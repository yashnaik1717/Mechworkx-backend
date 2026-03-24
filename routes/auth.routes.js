const express = require("express");
const router = express.Router();
const { signup, verifyOTP, login } = require("../controllers/auth.controller");

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);

module.exports = router;
