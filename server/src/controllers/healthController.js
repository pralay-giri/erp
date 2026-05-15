import os from 'os';
import sequelize from '../config/database.js';

/**
 * Health Check & System Monitor (JSON Data Only)
 * Provides real-time server status and hardware usage
 */
export const getSystemHealth = async (req, res) => {
  try {
    // 1. Collect System Metrics
    const uptime = process.uptime();
    const systemUptime = os.uptime();
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // 2. Check Database Status
    let dbStatus = 'CONNECTED';
    try {
      await sequelize.authenticate();
    } catch (err) {
      dbStatus = 'DISCONNECTED';
    }

    // 3. Prepare Data
    const stats = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      process: {
        uptime: formatUptime(uptime),
        uptimeSeconds: Math.floor(uptime),
        version: process.version,
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external),
          raw: memoryUsage
        }
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: formatUptime(systemUptime),
        totalMem: formatBytes(totalMem),
        freeMem: formatBytes(freeMem),
        memUsagePercent: ((1 - freeMem / totalMem) * 100).toFixed(2),
        cpuCount: cpus.length,
        cpuModel: cpus[0].model,
        loadAvg: loadAvg
      },
      database: dbStatus
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Health Check Error:', error);
    res.status(500).json({ success: false, error: 'Failed to collect health metrics' });
  }
};

// Helper Functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
