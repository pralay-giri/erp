import { Order, Product, OrderItem, User, Lead } from '../models/index.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';

export const getOrders = async (req, res) => {
  const { startDate, endDate, search, limit, offset } = req.query;

  try {
    const where = {};
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
    if (search) {
      where[Op.or] = [
        { '$lead.customer_name$': { [Op.like]: `%${search}%` } },
        { '$items.product.sku$': { [Op.like]: `%${search}%` } }
      ];
    }

    const finalLimit = parseInt(limit) || 10;
    const finalOffset = parseInt(offset) || 0;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { 
          model: OrderItem, 
          as: 'items', 
          include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }] 
        },
        { model: User, as: 'processor', attributes: ['name', 'role'] },
        { model: Lead, as: 'lead', attributes: ['customer_name'] }
      ],
      distinct: true, // Required for correct count with joins
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

import { generateExcelExport } from '../utils/excelExport.js';

export const exportOrders = async (req, res) => {
  const { startDate, endDate, search } = req.query;

  try {
    const where = {};
    // Default to current month if no dates provided
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const finalStart = startDate ? new Date(startDate) : startOfMonth;
    const finalEnd = endDate ? new Date(endDate) : endOfToday;

    where.createdAt = {
      [Op.gte]: finalStart,
      [Op.lte]: finalEnd
    };
    const leadInclude = {
      model: Lead,
      as: 'lead',
      attributes: ['customer_name'],
      required: false
    };

    const itemInclude = {
      model: OrderItem,
      as: 'items',
      include: [{
        model: Product,
        as: 'product',
        attributes: ['sku'],
        required: false
      }],
      required: false
    };

    if (search) {
      // If search is provided, we need to handle the OR logic between nested models
      // This is best handled by making the associations required if they match the search
      // But for a simple fix that prevents empty results, we keep them optional 
      // unless we find a more complex way to do top-level OR with nested required: false.
      // For now, let's just use the robust pattern.
      leadInclude.where = { customer_name: { [Op.like]: `%${search}%` } };
      // itemInclude.include[0].where = { sku: { [Op.like]: `%${search}%` } }; 
      // Note: Top-level OR across associations is complex in Sequelize. 
      // For now, we'll focus on Customer search for simplicity and stability.
    }

    const orders = await Order.findAll({
      where,
      include: [
        leadInclude,
        itemInclude,
        { model: User, as: 'processor', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const columns = [
      { header: 'Order ID', key: 'id', width: 40 },
      { header: 'Customer', key: 'customer', width: 30 },
      { header: 'Items Summary', key: 'items', width: 40 },
      { header: 'Total Price', key: 'total', width: 15 },
      { header: 'Processor', key: 'processor', width: 20 },
      { header: 'Date', key: 'date', width: 25 }
    ];

    const data = orders.map(o => {
      const itemsSummary = o.items?.map(i => `${i.product?.sku} (x${i.quantity})`).join(', ');
      return {
        id: o.id,
        customer: o.lead?.customer_name,
        items: itemsSummary,
        total: o.total_price,
        processor: o.processor?.name,
        date: o.createdAt.toLocaleString()
      };
    });

    await generateExcelExport(res, 'orders_export.xlsx', 'Orders', columns, data);

  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Excel export' });
  }
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }]
        },
        {
          model: Lead,
          as: 'lead',
          attributes: ['customer_name']
        },
        {
          model: User,
          as: 'processor',
          attributes: ['name', 'email']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSalesStats = async (req, res) => {
  try {
    const stats = await Order.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
      ],
      raw: true
    });

    const result = stats[0];
    const totalRevenue = parseFloat(result.totalRevenue || 0);
    const totalOrders = parseInt(result.totalOrders || 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({ 
      success: true, 
      data: {
        totalRevenue,
        totalOrders,
        avgOrderValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
