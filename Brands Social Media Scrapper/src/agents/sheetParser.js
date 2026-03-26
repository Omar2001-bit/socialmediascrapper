// XLSX is loaded globally via CDN in index.html
/**
 * Parses an Excel file (.xlsx or .xls) to extract competitor names and URLs.
 * Auto-detects the columns containing "name"/"brand"/"company" and "url"/"website"/"domain"/"link".
 * Falls back to the first column for name and second column for URL if headers aren't clear.
 * 
 * @param {File} file - The file object from the browser file input
 * @returns {Promise<{ competitors: {name: string, url: string}[], columnMap: {nameCol: string, urlCol: string}, parseError: string | null }>}
 */
export async function parseXLSX(file) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            resolve({ competitors: [], columnMap: { nameCol: '', urlCol: '' }, parseError: 'No sheets found in workbook.' });
            return;
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Use header: 1 to get an array of arrays (rows)
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (rows.length === 0) {
            resolve({ competitors: [], columnMap: { nameCol: '', urlCol: '' }, parseError: 'Sheet is empty.' });
            return;
          }

          // Assume first row is header
          const headers = rows[0].map(h => String(h).trim());
          
          let nameColIndex = -1;
          let urlColIndex = -1;
          let nameColHeader = '';
          let urlColHeader = '';

          // Regex for detecting columns
          const nameRegex = /name|brand|company/i;
          const urlRegex = /url|website|site|link|domain/i;

          // 1. Scan for matching headers
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            if (nameColIndex === -1 && nameRegex.test(h)) {
              nameColIndex = i;
              nameColHeader = h;
            } else if (urlColIndex === -1 && urlRegex.test(h)) {
              urlColIndex = i;
              urlColHeader = h;
            }
          }

          // 2. Fall back to first two columns if no match found
          if (nameColIndex === -1) {
            nameColIndex = 0;
            nameColHeader = headers[0] || 'Column 1';
          }
          if (urlColIndex === -1) {
            // Find the first column that isn't the name column
            urlColIndex = headers.length > 1 && nameColIndex === 0 ? 1 : 0;
            if (urlColIndex === nameColIndex && headers.length > 1) {
                urlColIndex = 1;
            }
            urlColHeader = headers[urlColIndex] || 'Column 2';
          }

          // 3. Map rows to structured objects and filter out empty rows
          const competitors = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const nameField = row[nameColIndex] !== undefined ? String(row[nameColIndex]).trim() : '';
            const urlField = row[urlColIndex] !== undefined ? String(row[urlColIndex]).trim() : '';

            // Filter out blank rows
            if (nameField === '' && urlField === '') {
              continue;
            }

            competitors.push({
              name: nameField,
              url: urlField
            });
          }

          resolve({
            competitors,
            columnMap: {
              nameCol: nameColHeader,
              urlCol: urlColHeader
            },
            parseError: null
          });
        } catch (err) {
          resolve({ competitors: [], columnMap: { nameCol: '', urlCol: '' }, parseError: 'Error parsing Excel file content: ' + err.message });
        }
      };
      
      reader.onerror = (err) => {
        resolve({ competitors: [], columnMap: { nameCol: '', urlCol: '' }, parseError: 'Error reading file: ' + err });
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      resolve({ competitors: [], columnMap: { nameCol: '', urlCol: '' }, parseError: 'Unexpected error initializing file parser: ' + err.message });
    }
  });
}
