import { Product, StockTransaction } from '../models/index.js';
import sequelize from '../config/database.js';
import { generateExcelExport } from '../utils/excelExport.js';
import { Op } from 'sequelize';

export const getInventory = async (req, res) => {
  const { search, limit, offset, startDate, endDate } = req.query;

  try {
    const where = {};

    // 1. Low Stock Filter
    if (req.query.lowStock === 'true') {
      where.current_stock = { [Op.lt]: 10 };
    }

    // 1. Search Filter (Partial match on name or sku)
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    // 2. Date Range (Creation date)
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

    const finalLimit = parseInt(limit) || 10;
    const finalOffset = parseInt(offset) || 0;

    const { count, rows } = await Product.findAndCountAll({
      where,
      order: [['name', 'ASC']],
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

export const exportInventory = async (req, res) => {
  const { search, startDate, endDate } = req.query;

  try {
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

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

    const products = await Product.findAll({
      where,
      order: [['name', 'ASC']]
    });

    const columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Current Stock', key: 'stock', width: 15 }
    ];

    const data = products.map(p => ({
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.current_stock
    }));

    await generateExcelExport(res, 'inventory_report.xlsx', 'Inventory', columns, data);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export inventory' });
  }
};

export const updateStock = async (req, res) => {
  const { productId, amount } = req.body; // amount should be positive for restock

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Restock amount must be greater than zero' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const product = await Product.findByPk(productId, { transaction: t });

      if (!product) {
        throw new Error('Product not found');
      }

      // Update current stock
      await product.increment('current_stock', { by: amount, transaction: t });

      // Create Audit Entry
      const transaction = await StockTransaction.create({
        product_id: productId,
        change_amount: amount,
        type: 'RESTOCK',
        timestamp: new Date()
      }, { transaction: t });

      return {
        productName: product.name,
        newStock: product.current_stock + amount,
        transactionId: transaction.id
      };
    });

    res.json({ success: true, message: 'Stock updated successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const createProduct = async (req, res) => {
  const { name, sku, price, initialStock } = req.body;

  if (!name || !sku || price === undefined) {
    return res.status(400).json({ success: false, error: 'Name, SKU, and Price are required.' });
  }

  if (parseFloat(price) <= 0) {
    return res.status(400).json({ success: false, error: 'Price must be greater than zero.' });
  }

  if (parseInt(initialStock) < 0) {
    return res.status(400).json({ success: false, error: 'Initial stock cannot be negative.' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const product = await Product.create({
        name,
        sku,
        price: parseFloat(price),
        current_stock: parseInt(initialStock) || 0
      }, { transaction: t });

      if (parseInt(initialStock) > 0) {
        await StockTransaction.create({
          product_id: product.id,
          change_amount: parseInt(initialStock),
          type: 'INITIAL_STOCK',
          timestamp: new Date()
        }, { transaction: t });
      }

      return product;
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: result });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError' || (error.errors && error.errors[0].type === 'unique violation')) {
      return res.status(400).json({ success: false, error: 'UNIQUE_CONSTRAINT: SKU already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { productId, price, current_stock, name, sku } = req.body;

  try {
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (price !== undefined) product.price = price;
    if (current_stock !== undefined) product.current_stock = current_stock;
    if (name) product.name = name;
    if (sku) product.sku = sku;

    await product.save();

    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getStockTransactions = async (req, res) => {
  const { startDate, endDate, search, type, limit, offset } = req.query;

  try {
    const where = {};
    const productWhere = {};

    if (type) where.type = type;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.timestamp[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = end;
      }
    }

    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    const finalLimit = parseInt(limit) || 10;
    const finalOffset = parseInt(offset) || 0;

    const productInclude = {
      model: Product,
      as: 'product',
      attributes: ['name', 'sku'],
      required: false
    };

    if (Object.keys(productWhere).length > 0) {
      productInclude.where = productWhere;
      productInclude.required = true; // Only force inner join when actively searching for a product
    }

    const { count, rows } = await StockTransaction.findAndCountAll({
      where,
      include: [productInclude],
      order: [['timestamp', 'DESC']],
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

export const exportStockTransactions = async (req, res) => {
  const { startDate, endDate, search, type } = req.query;

  try {
    const where = {};
    const productWhere = {};

    if (type) where.type = type;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let finalStart = startOfMonth;
    let finalEnd = endOfToday;

    if (startDate) {
      finalStart = new Date(startDate);
      finalStart.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      finalEnd = new Date(endDate);
      finalEnd.setHours(23, 59, 59, 999);
    }

    where.timestamp = {
      [Op.gte]: finalStart,
      [Op.lte]: finalEnd
    };

    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    const productInclude = {
      model: Product,
      as: 'product',
      attributes: ['name', 'sku'],
      required: false
    };

    if (Object.keys(productWhere).length > 0) {
      productInclude.where = productWhere;
      productInclude.required = true; // Only force inner join when searching
    }

    const transactions = await StockTransaction.findAll({
      where,
      include: [productInclude],
      order: [['timestamp', 'DESC']]
    });

    const columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 }
    ];

    const data = transactions.map(t => ({
      date: t.timestamp.toLocaleString(),
      product: t.product?.name || 'N/A',
      sku: t.product?.sku || 'N/A',
      type: t.type,
      amount: t.change_amount
    }));

    await generateExcelExport(res, 'stock_transactions_report.xlsx', 'Transactions', columns, data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
