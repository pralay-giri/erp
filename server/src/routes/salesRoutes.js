import express from 'express';
import { getOrders, getSalesStats, exportOrders, getOrderById } from '../controllers/salesController.js';
import { authorize } from '../middleware/auth.js';
import { ACCESS_LEVELS, ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/', authorize(ACCESS_LEVELS.SALES), getOrders);
router.get('/stats', authorize(ACCESS_LEVELS.SALES), getSalesStats);
router.get('/export', authorize([ROLES.ADMIN]), exportOrders);
router.get('/:id', authorize(ACCESS_LEVELS.SALES), getOrderById);

export default router;
