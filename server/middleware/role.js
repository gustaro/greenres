export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Insufficient permissions" });
  next();
};

export const isAdmin                 = requireRole("ADMIN");
export const isStaffOrAdmin          = requireRole("STAFF", "ADMIN");
export const isKitchenOrAdmin        = requireRole("KITCHEN", "ADMIN");
export const isRiderOrAdmin          = requireRole("RIDER", "ADMIN");
export const isKitchenOrStaffOrAdmin = requireRole("KITCHEN", "STAFF", "ADMIN");
