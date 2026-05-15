import User from './User.js';
import Lead from './Lead.js';
import Product from './Product.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import StockTransaction from './StockTransaction.js';

// Associations

// User -> Leads
User.hasMany(Lead, { foreignKey: 'assigned_to', as: 'assignedLeads' });
Lead.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Lead -> Orders
Lead.hasMany(Order, { foreignKey: 'lead_id', as: 'orders' });
Order.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });

// Order -> OrderItems
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Product -> OrderItems
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User -> Orders (processed_by)
User.hasMany(Order, { foreignKey: 'processed_by', as: 'processedOrders' });
Order.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });

// Product -> StockTransactions
Product.hasMany(StockTransaction, { foreignKey: 'product_id', as: 'transactions' });
StockTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

export {
  User,
  Lead,
  Product,
  Order,
  OrderItem,
  StockTransaction
};
