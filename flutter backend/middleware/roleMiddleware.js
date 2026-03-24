const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.user_type) {
            return res.status(403).json({ success: false, message: "No role information found" });
        }

        const userRole = req.user.user_type;

        // Admin always has access
        if (userRole === 'admin') return next();

        // 'both' role has access to customer and vendor endpoints
        if (userRole === 'both' && (allowedRoles.includes('customer') || allowedRoles.includes('vendor'))) {
            return next();
        }

        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ success: false, message: `Access denied. Role ${userRole} is not authorized.` });
    };
};

module.exports = { authorizeRoles };
