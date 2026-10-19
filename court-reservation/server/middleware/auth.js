const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);

    if (decoded.stage) {
      return res.status(401).json({ message: "Please finish the PIN step first" });
    }

    req.user = await User.findById(decoded.id).select("-password -securityAnswer -pin");

    if (!req.user || req.user.isArchived) {
      return res.status(401).json({ message: "Account is deactivated or no longer exists" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  res.status(403).json({ message: "Your role cannot do this" });
};

module.exports = {
  protect,
  requireRole,
  customerOnly: requireRole("user"),
  staffOnly: requireRole("staff"),
  adminOnly: requireRole("admin"), 
  staffOrAdmin: requireRole("staff", "admin"),
};
