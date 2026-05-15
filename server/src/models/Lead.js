import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  // ── Required Fields ───────────────────────────────────────────────────────
  customer_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'Full name of the lead/contact person',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Primary contact phone number (required)',
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { isEmail: true },
    comment: 'Lead email address (required)',
  },

  // ── Optional Fields ───────────────────────────────────────────────────────
  company: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Company or business name',
  },
  source: {
    type: DataTypes.ENUM('WALK_IN', 'REFERRAL', 'ONLINE', 'COLD_CALL', 'OTHER'),
    allowNull: true,
    defaultValue: 'OTHER',
    comment: 'How this lead was acquired',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Free-form notes about the lead',
  },

  // ── Status & Assignment ───────────────────────────────────────────────────
  status: {
    type: DataTypes.ENUM('NEW', 'CONVERTED'),
    defaultValue: 'NEW',
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'leads',
});

export default Lead;
