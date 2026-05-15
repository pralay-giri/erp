import { Lead, User } from '../models/index.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { generateExcelExport } from '../utils/excelExport.js';

export const getLeads = async (req, res) => {
  const { startDate, endDate, search, status, limit, offset } = req.query;
  const { id: userId, role } = req.user;

  try {
    const where = {};

    // Role-based filtering: Sales only see their own leads
    if (role === 'sales') {
      where.assigned_to = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    // Search across name, phone, email, and company
    if (search) {
      where[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { phone:         { [Op.like]: `%${search}%` } },
        { email:         { [Op.like]: `%${search}%` } },
        { company:       { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) where.status = status;

    const finalLimit  = parseInt(limit)  || 10;
    const finalOffset = parseInt(offset) || 0;

    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
      limit: finalLimit,
      offset: finalOffset
    });

    res.json({
      success: true,
      data: rows,
      meta: {
        totalItems: count,
        limit: finalLimit,
        offset: finalOffset
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exportLeads = async (req, res) => {
  const { startDate, endDate, search, status } = req.query;
  const { id: userId, role } = req.user;

  try {
    const where = {};

    if (role === 'sales') {
      where.assigned_to = userId;
    }

    // Default to current month if no dates provided
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const finalStart = startDate ? new Date(startDate) : startOfMonth;
    const finalEnd   = endDate   ? new Date(endDate)   : endOfToday;

    where.createdAt = {
      [Op.gte]: finalStart,
      [Op.lte]: finalEnd
    };

    if (search) {
      where[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { phone:         { [Op.like]: `%${search}%` } },
        { email:         { [Op.like]: `%${search}%` } },
        { company:       { [Op.like]: `%${search}%` } },
      ];
    }
    if (status) where.status = status;

    const leads = await Lead.findAll({
      where,
      include: [{ model: User, as: 'assignee', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });

    const columns = [
      { header: 'Lead ID',       key: 'id',       width: 40 },
      { header: 'Customer Name', key: 'name',     width: 30 },
      { header: 'Phone',         key: 'phone',    width: 20 },
      { header: 'Email',         key: 'email',    width: 30 },
      { header: 'Company',       key: 'company',  width: 25 },
      { header: 'Source',        key: 'source',   width: 15 },
      { header: 'Status',        key: 'status',   width: 15 },
      { header: 'Assigned To',   key: 'assignee', width: 25 },
      { header: 'Notes',         key: 'notes',    width: 40 },
      { header: 'Created At',    key: 'date',     width: 25 },
    ];

    const data = leads.map(l => ({
      id:       l.id,
      name:     l.customer_name,
      phone:    l.phone    || '',
      email:    l.email    || '',
      company:  l.company  || '',
      source:   l.source   || '',
      status:   l.status,
      assignee: l.assignee?.name || 'Unassigned',
      notes:    l.notes    || '',
      date:     l.createdAt.toLocaleString()
    }));

    await generateExcelExport(res, 'leads_export.xlsx', 'Leads', columns, data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export leads' });
  }
};

export const getSalesStaff = async (req, res) => {
  const { search } = req.query;
  try {
    const where = { role: 'sales' };
    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const staff = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'leads_count', 'orders_count'],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLead = async (req, res) => {
  const {
    customer_name,
    phone,
    email,
    company,
    source,
    notes,
    assigned_to
  } = req.body;

  // ── Validation ────────────────────────────────────────────────────────────
  const errors = [];
  if (!customer_name?.trim()) errors.push('customer_name is required');
  if (!phone?.trim())         errors.push('phone is required');
  if (!email?.trim())         errors.push('email is required');

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email.trim())) {
    errors.push('email format is invalid');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const newLead = await Lead.create({
        customer_name: customer_name.trim(),
        phone:         phone.trim(),
        email:         email.trim().toLowerCase(),
        company:       company?.trim()  || null,
        source:        source           || 'OTHER',
        notes:         notes?.trim()    || null,
        assigned_to,
        status: 'NEW'
      }, { transaction: t });

      // Increment counter column on User model
      if (assigned_to) {
        await User.increment('leads_count', { by: 1, where: { id: assigned_to }, transaction: t });
      }

      return newLead;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const assignLead = async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;

  try {
    const result = await sequelize.transaction(async (t) => {
      const lead = await Lead.findByPk(id, { transaction: t });
      if (!lead) throw new Error('Lead not found');

      const oldAssigneeId = lead.assigned_to;

      // Update lead
      await lead.update({ assigned_to }, { transaction: t });

      // Update lead counts for users
      if (oldAssigneeId) {
        await User.decrement('leads_count', { by: 1, where: { id: oldAssigneeId }, transaction: t });
      }
      if (assigned_to) {
        await User.increment('leads_count', { by: 1, where: { id: assigned_to }, transaction: t });
      }

      return lead;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};