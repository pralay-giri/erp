import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StockTransaction = sequelize.define('StockTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  change_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('SALE', 'RESTOCK', 'INITIAL_STOCK', 'ADJUSTMENT'),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  tableName: 'stock_transactions',
  timestamps: false, // Using timestamp field instead
});

export default StockTransaction;
