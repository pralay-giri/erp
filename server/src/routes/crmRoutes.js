import express from 'express';
import { getLeads, createLead, exportLeads, getSalesStaff, assignLead } from '../controllers/crmController.js';
import { authorize } from '../middleware/auth.js';
import { ACCESS_LEVELS, ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/', authorize(ACCESS_LEVELS.CRM), getLeads);
router.post('/', authorize(ACCESS_LEVELS.CRM), createLead);
router.get('/export', authorize([ROLES.ADMIN]), exportLeads);
router.get('/sales-staff', authorize([ROLES.ADMIN]), getSalesStaff);
router.patch('/:id/assign', authorize([ROLES.ADMIN]), assignLead);

export default router;
