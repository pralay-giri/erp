import { User } from '../models/index.js';
import jwt from 'jsonwebtoken';

// Single source of truth for route-level permissions.
// Add or modify routes here; the frontend reads this from the login response.
const ROLE_ROUTES = {
  admin:     ['/', 'crm', 'sales', 'warehouse', 'transactions', 'health'],
  sales:     ['/', 'crm', 'sales'],
  warehouse: ['/', 'warehouse'],
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Validate Input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Find User
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Generate JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Resolve allowed routes for this role
    const allowedRoutes = ROLE_ROUTES[user.role?.toLowerCase()] ?? ['/'];

    // 6. Send Standardized Response
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedRoutes,
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: "Internal server error during login" });
  }
};
