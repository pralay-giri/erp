import express from 'express';
import dotenv from 'dotenv';
import sequelize from './src/config/database.js';
import './src/models/index.js'; // Ensure associations are loaded
import runAllSeeders from './src/seeders/runAll.js';
import orderRoutes from './src/routes/orderRoutes.js';
import crmRoutes from './src/routes/crmRoutes.js';
import salesRoutes from './src/routes/salesRoutes.js';
import warehouseRoutes from './src/routes/warehouseRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import morgan from 'morgan';
import cors from 'cors';
import { authorize } from './src/middleware/auth.js';
import { getSystemHealth } from './src/controllers/healthController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Allow all origins
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/leads', crmRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/dashboard', dashboardRoutes);

// System Monitor (Admin Only)
app.get('/api/health', authorize(['admin']), getSystemHealth);

const startServer = async () => {
  try {
    const isForce = process.argv.includes('--force');
    const isSync = process.argv.includes('--sync') || isForce;
    const shouldSeed = process.argv.includes('--seed');

    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    if (isSync) {
      console.log(isForce ? '⚠️  Forcing database sync (dropping tables)...' : '🔄 Synchronizing database...');
      await sequelize.sync({ force: isForce, alter: !isForce });
      console.log('✅ Database synchronized.');

      if (shouldSeed) {
        await runAllSeeders();
      }
    } else if (process.env.NODE_ENV === 'development' && shouldSeed) {
      // Allow seeding in dev even without a full sync
      await runAllSeeders();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
