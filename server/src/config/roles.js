/**
 * Role-Based Access Control Constants
 * Centralized definition of roles permitted for specific modules
 */

export const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  WAREHOUSE: 'warehouse'
};

export const ACCESS_LEVELS = {
  // CRM & Leads management
  CRM: [ROLES.ADMIN, ROLES.SALES],
  
  // Sales & Order processing
  SALES: [ROLES.ADMIN, ROLES.SALES],
  
  // Warehouse & Inventory management
  WAREHOUSE: [ROLES.ADMIN, ROLES.WAREHOUSE],
  
  // Public or general access
  PUBLIC: [ROLES.ADMIN, ROLES.SALES, ROLES.WAREHOUSE]
};
