import { parentPort, workerData } from 'worker_threads';
import { Order, Lead, Product, StockTransaction, User, OrderItem } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

const calculateMetrics = async () => {
  const { role, userId } = workerData;

  try {
    let data = {};
    switch (role) {
      case 'admin':
        data = await getAdminMetrics();
        break;
      case 'sales':
        data = await getSalesMetrics(userId);
        break;
      case 'warehouse':
        data = await getWarehouseMetrics();
        break;
      default:
        throw new Error('Invalid role for dashboard worker');
    }
    parentPort.postMessage({ success: true, data });
  } catch (error) {
    console.error('Dashboard Worker Error:', error);
    parentPort.postMessage({ success: false, error: error.message });
  }
};

const getAdminMetrics = async () => {
  const [revenueResult, leadCount, orderCount, lowStockCount, topSalesPerformance, topProducts] = await Promise.all([
    Order.sum('total_price'),
    Lead.count(),
    Order.count(),
    Product.count({ where: { current_stock: { [Op.lt]: 10 } } }),
    User.findAll({
      where: { role: 'sales' },
      attributes: [
        'id', 'name', 'email',
        [sequelize.fn('SUM', sequelize.col('processedOrders.total_price')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT `processedOrders`.`id`')), 'totalOrders'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT CASE WHEN `assignedLeads`.`status` = "CONVERTED" THEN `assignedLeads`.`id` END')), 'conversions']
      ],
      include: [
        { model: Order, as: 'processedOrders', attributes: [] },
        { model: Lead, as: 'assignedLeads', attributes: [] }
      ],
      group: ['User.id'],
      order: [[sequelize.literal('totalRevenue'), 'DESC']],
      limit: 5,
      subQuery: false
    }),
    Product.findAll({
      attributes: [
        'id', 'name', 'sku',
        [sequelize.fn('SUM', sequelize.col('orderItems.quantity')), 'totalSold']
      ],
      include: [{
        model: OrderItem,
        as: 'orderItems',
        attributes: [],
        required: true
      }],
      group: ['Product.id'],
      order: [[sequelize.literal('totalSold'), 'DESC']],
      limit: 5,
      subQuery: false
    })
  ]);

  return {
    totalRevenue: parseFloat(revenueResult || 0),
    totalLeads: leadCount,
    totalOrders: orderCount,
    lowStockAlerts: lowStockCount,
    topSalesPerformance: topSalesPerformance.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      revenue: parseFloat(u.getDataValue('totalRevenue') || 0),
      orders: parseInt(u.getDataValue('totalOrders') || 0),
      conversions: parseInt(u.getDataValue('conversions') || 0)
    })),
    topSellingProducts: topProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      totalSold: parseInt(p.getDataValue('totalSold') || 0)
    }))
  };
};

const getSalesMetrics = async (userId) => {
  const [user, topProducts] = await Promise.all([
    User.findByPk(userId, { attributes: ['leads_count', 'orders_count'] }),
    Product.findAll({
      where: { current_stock: { [Op.gt]: 0 } },
      order: [['price', 'DESC']],
      limit: 5,
      attributes: ['name', 'price', 'sku']
    })
  ]);

  return {
    myAssignedLeads: user?.leads_count || 0,
    myProcessedOrders: user?.orders_count || 0,
    topPremiumProducts: topProducts || []
  };
};

const getWarehouseMetrics = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [skuCount, criticalStock, transactionsToday, topMovingProducts] = await Promise.all([
    Product.count(),
    Product.findAll({
      where: { current_stock: { [Op.lt]: 5 } },
      attributes: ['name', 'sku', 'current_stock']
    }),
    StockTransaction.count({
      where: {
        timestamp: { [Op.gte]: today }
      }
    }),
    Product.findAll({
      attributes: [
        'id', 'name', 'sku', 'current_stock',
        [sequelize.fn('SUM', sequelize.col('orderItems.quantity')), 'totalSold']
      ],
      include: [{
        model: OrderItem,
        as: 'orderItems',
        attributes: [],
        required: true
      }],
      group: ['Product.id'],
      order: [[sequelize.literal('totalSold'), 'DESC']],
      limit: 5,
      subQuery: false
    })
  ]);

  return {
    totalSKUs: skuCount || 0,
    criticalStockItems: criticalStock || [],
    transactionsToday: transactionsToday || 0,
    topMovingProducts: topMovingProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.current_stock,
      totalSold: parseInt(p.getDataValue('totalSold') || 0)
    }))
  };
};

calculateMetrics();
