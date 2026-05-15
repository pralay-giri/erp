import express from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { authorize } from '../middleware/auth.js';
import { ACCESS_LEVELS } from '../config/roles.js';

const router = express.Router();

// Dashboard is accessible to all authenticated roles, but logic is role-specific
router.get('/', authorize(ACCESS_LEVELS.PUBLIC), getDashboardData);

export default router;
