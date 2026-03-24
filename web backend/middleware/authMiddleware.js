const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

const requireCustomer = (req, res, next) => {
    const userType = req.user?.user_type;
    if (userType !== "customer" && userType !== "both") {
        return res.status(403).json({ message: "Access denied. This action is for customers only." });
    }
    return next();
};

module.exports = { auth, requireCustomer };
