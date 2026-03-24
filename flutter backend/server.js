require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/jobRoutes");
const bidRoutes = require("./routes/bidRoutes");
const progressRoutes = require("./routes/progressRoutes");
const miscRoutes = require("./routes/miscRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/dash", miscRoutes);
app.use("/api/messages", messageRoutes);

// Root check
app.get("/", (req, res) => {
  res.json({ ok: true, service: "MeckWorkx-backend", version: "2.0.0" });
});

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MeckWorkx Backend running on http://localhost:${PORT}`);
});
