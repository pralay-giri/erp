import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Offloads Excel generation to a Worker Thread to keep the main thread responsive
 */
export const generateExcelExport = async (res, fileName, sheetName, columns, data) => {
  return new Promise((resolve, reject) => {
    // Path to the worker script
    const workerPath = path.join(__dirname, '../workers/excelWorker.js');

    const worker = new Worker(workerPath, {
      workerData: { sheetName, columns, data }
    });

    worker.on('message', (message) => {
      if (message.success) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(message.buffer);
        resolve();
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};
