export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.roleName)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
