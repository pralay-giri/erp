import express from 'express';
import { convertLeadToOrder } from '../controllers/orderController.js';
import { authorize } from '../middleware/auth.js';
import { ACCESS_LEVELS } from '../config/roles.js';

const router = express.Router();

// The "Golden Path" - CRM Lead to Sales Order conversion
router.post('/convert', authorize(ACCESS_LEVELS.SALES), convertLeadToOrder);

export default router;
