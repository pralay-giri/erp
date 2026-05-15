import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * RBAC Authorization Middleware
 * Authenticates via JWT token and fetches/validates role
 */
export const authorize = (allowedRoles) => {
  return async (req, res, next) => {
    // 1. Get Token from Authorization Header (Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required: Missing token" });
    }

    try {
      // 2. Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Fetch User from MySQL Database to ensure identity is still valid
      const user = await User.findByPk(decoded.id, { attributes: ['id', 'role'] });

      if (!user) {
        return res.status(401).json({ message: "Invalid user identity" });
      }

      // 4. Attach User Data for downstream controllers
      req.user = {
        id: user.id,
        role: user.role
      };

      // 5. Validate Permission (Optional: if allowedRoles is provided)
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied: Insufficient permissions" });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Session expired, please login again" });
      }
      console.error('Middleware Error:', error);
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};

