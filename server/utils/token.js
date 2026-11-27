import jwt from "jsonwebtoken";

export const generateToken = (employee) => {
  const roleName = employee.roleId?.roleName || employee.roleName || "Employee";
  return jwt.sign(
    {
      id: employee._id,
      roleName,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};
