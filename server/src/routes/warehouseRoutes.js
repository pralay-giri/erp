import express from 'express';
import { getInventory, updateStock, exportInventory, updateProduct, createProduct, getStockTransactions, exportStockTransactions } from '../controllers/warehouseController.js';
import { authorize } from '../middleware/auth.js';
import { ACCESS_LEVELS, ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/inventory', authorize(ACCESS_LEVELS.PUBLIC), getInventory);
router.get('/export', authorize([ROLES.ADMIN]), exportInventory);
router.post('/restock', authorize(ACCESS_LEVELS.WAREHOUSE), updateStock);
router.post('/update-product', authorize(ACCESS_LEVELS.WAREHOUSE), updateProduct);
router.post('/products', authorize(ACCESS_LEVELS.WAREHOUSE), createProduct);
router.get('/transactions', authorize([ROLES.ADMIN]), getStockTransactions);
router.get('/transactions/export', authorize([ROLES.ADMIN]), exportStockTransactions);

export default router;
