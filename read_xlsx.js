const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '01.09.2025-30.09.2025.xlsx');
try {
  const workbook = xlsx.readFile(filePath);
  const data = {};
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    data[sheetName] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
  });

  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error("Error reading xlsx:", e);
}
