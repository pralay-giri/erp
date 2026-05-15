import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  current_stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
}, {
  tableName: 'products',
  // Add DB-level check constraint for PostgreSQL
  hooks: {
    afterSync: async (instance, options) => {
      try {
        const dialect = sequelize.getDialect();
        if (dialect === 'mysql' || dialect === 'postgres') {
          await sequelize.query(`
            ALTER TABLE products 
            DROP CONSTRAINT IF EXISTS check_stock_positive;
          `);
          await sequelize.query(`
            ALTER TABLE products 
            ADD CONSTRAINT check_stock_positive CHECK (current_stock >= 0);
          `);
        }
      } catch (error) {
        // MySQL < 8.0.16 might fail on DROP CONSTRAINT IF EXISTS
        // We'll log it but not crash
        console.warn('Note: DB-level check constraint not applied (possibly unsupported DB version).');
      }
    }
  }
});

export default Product;
