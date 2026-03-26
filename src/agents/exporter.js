/**
 * Export Agent (A4)
 * Generates CSV and XLSX files from the aggregated results array.
 */

const PLATFORM_COLUMNS = [
  'Facebook',
  'Twitter',
  'Instagram',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Pinterest',
  'Snapchat',
  'Threads'
];

/**
 * Returns a YYYY-MM-DD string for the current date.
 */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Maps a single result object into a flat array of string values 
 * matching the exact column order expected by the PRD.
 */
function resultToRow(result) {
  const row = [
    result.name || '',
    result.url || '',
    result.status || ''
  ];
  
  if (!result.socials) {
    result.socials = {};
  }
  
  PLATFORM_COLUMNS.forEach(platform => {
    row.push(result.socials[platform] || '');
  });
  
  return row;
}

/**
 * Generates and triggers a download of a CSV file containing the results.
 * @param {Array} results - The active results array
 */
export function exportCSV(results) {
  if (!results || results.length === 0) return;

  const headers = ['Brand', 'Website', 'Status', ...PLATFORM_COLUMNS];
  
  // CSV escaping: wrap in quotes, escape existing quotes with double quotes
  const escapeCell = (cell) => {
    if (typeof cell !== 'string') return cell;
    const escaped = cell.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = [
    headers.map(escapeCell).join(','),
    ...results.map(r => resultToRow(r).map(escapeCell).join(','))
  ];

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const dateStr = getTodayDateString();
  const filename = `competitor_socials_${dateStr}.csv`;
  
  triggerDownload(blob, filename);
}

/**
 * Generates and triggers a download of an XLSX file containing the results.
 * Requires the global `XLSX` (SheetJS) object to be loaded in the browser.
 * @param {Array} results - The active results array
 */
export function exportXLSX(results) {
  if (!results || results.length === 0) return;
  if (typeof XLSX === 'undefined') {
    console.error('SheetJS (XLSX) is not loaded. Cannot export XLSX.');
    return;
  }

  const headers = ['Brand', 'Website', 'Status', ...PLATFORM_COLUMNS];
  
  const data = [
    headers,
    ...results.map(resultToRow)
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Competitor Socials');

  const dateStr = getTodayDateString();
  const filename = `competitor_socials_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

/**
 * Helper to trigger file download in the browser
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
