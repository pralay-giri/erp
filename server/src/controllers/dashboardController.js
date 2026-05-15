import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Dashboard Worker
 * Offloads heavy aggregation queries to a separate thread
 */
const runDashboardWorker = (workerData) => {
  return new Promise((resolve, reject) => {
    // Resolve the path to the worker file
    const workerPath = path.resolve(__dirname, '../workers/dashboardWorker.js');
    
    const worker = new Worker(workerPath, { workerData });

    worker.on('message', (result) => {
      if (result.success) {
        resolve(result.data);
      } else {
        reject(new Error(result.error || 'Worker calculation failed'));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Dashboard worker stopped with exit code ${code}`));
    });
  });
};

export const getDashboardData = async (req, res) => {
  const { id: userId, role } = req.user;

  try {
    // Offload all dashboard calculations to the worker thread
    const dashboardData = await runDashboardWorker({ role, userId });

    res.json({ 
      success: true, 
      role, 
      data: dashboardData 
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard metrics via worker' 
    });
  }
};

