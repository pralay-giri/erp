import { parentPort, workerData } from 'worker_threads';
import ExcelJS from 'exceljs';

const generateExcel = async () => {
  const { sheetName, columns, data } = workerData;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Define Columns
    worksheet.columns = columns;

    // Format Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };

    // Add Rows
    worksheet.addRows(data);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send result back to main thread
    parentPort.postMessage({ success: true, buffer });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
};

generateExcel();
