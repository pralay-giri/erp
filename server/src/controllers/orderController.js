import { Lead, Product, Order, OrderItem, StockTransaction, User } from '../models/index.js';
import sequelize from '../config/database.js';

export const convertLeadToOrder = async (req, res) => {
  const { leadId, items } = req.body; // items: [{ productId, quantity }]
  const userId = req.user.id;

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('At least one product must be selected');
    }

    const result = await sequelize.transaction(async (t) => {
      // 1. Validate Lead
      const lead = await Lead.findByPk(leadId, { transaction: t });
      if (!lead) throw new Error('Lead not found');
      if (lead.status !== 'NEW') throw new Error('Lead must be in NEW status to convert');

      let orderTotalPrice = 0;
      const orderItemData = [];

      // 2. Validate all products and stock
      for (const item of items) {
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Invalid quantity for product ${item.productId}. Must be at least 1.`);
        }

        const product = await Product.findByPk(item.productId, { transaction: t });
        if (!product) throw new Error(`Product with ID ${item.productId} not found`);
        
        if (product.current_stock < qty) {
          throw new Error(`Insufficient stock for ${product.name} (Available: ${product.current_stock})`);
        }

        const itemTotal = parseFloat(product.price) * qty;
        orderTotalPrice += itemTotal;

        orderItemData.push({
          productId: item.productId,
          quantity: qty,
          unitPrice: product.price,
          productModel: product
        });
      }

      // 3. Create the Parent Order
      const order = await Order.create({
        lead_id: leadId,
        processed_by: userId,
        total_price: orderTotalPrice
      }, { transaction: t });

      // 4. Create Order Items and Update Stock
      for (const item of orderItemData) {
        await OrderItem.create({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice
        }, { transaction: t });

        // Decrement Stock
        await item.productModel.decrement('current_stock', { by: item.quantity, transaction: t });

        // Audit Entry
        await StockTransaction.create({
          product_id: item.productId,
          change_amount: -item.quantity,
          type: 'SALE',
          timestamp: new Date()
        }, { transaction: t });
      }

      // 5. Update Lead Status
      await lead.update({ status: 'CONVERTED' }, { transaction: t });

      // 6. Increment User Performance Counter
      await User.increment('orders_count', { by: 1, where: { id: userId }, transaction: t });

      return {
        orderId: order.id,
        totalPrice: orderTotalPrice,
        itemsCount: items.length
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully with multi-item support',
      data: result
    });

  } catch (error) {
    console.error('Multi-Item Conversion Error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to process multi-item order'
    });
  }
};
