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
const profileRoutes = require("./routes/profileRoutes");

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
app.use("/api/profile", profileRoutes);

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
// Listen on 0.0.0.0 so other devices on the local network can reach the API
// (not just 'localhost' which only works on the same machine)
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let localIp = 'unknown';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }
  console.log(`🚀 MeckWorkx Backend running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIp}:${PORT}  ← Use this URL on other devices`);
});

try { console.log('Checking nodemon server response...'); require('http').get('http://localhost:5000/api/profile/me', (res) => { console.log('Got response: ' + res.statusCode); }); } catch(err) {}
