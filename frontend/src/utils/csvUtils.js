const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NUMERIC_LITERAL = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * The one place that decides how a value is written into a CSV cell.
 *
 * Spreadsheet programs read a cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return as a
 * formula. Text that comes from the user (project and section names, custom labels, log lines) is
 * therefore prefixed with a single quote, the same convention the sections XLSX export uses.
 * Values that are numbers are never touched, so a negative result stays a number. A string that is
 * only a plain numeric literal (`-12.5`, `+3`, `1e-3`) cannot run anything and is also left alone,
 * as is a lone `-` or `+` placeholder.
 * Quoting for commas, quotes and line breaks is applied after that.
 */
export const neutraliseCsvText = (value) => {
  if (typeof value !== 'string') return value;
  if (!FORMULA_PREFIX.test(value)) return value;
  if (value === '-' || value === '+' || NUMERIC_LITERAL.test(value)) return value;
  return `'${value}`;
};

/**
 * One CSV cell: formula-neutralised, then quoted when it holds a comma, quote or line break.
 * @param {*} value - Cell value (a null or undefined value gives an empty cell).
 * @returns {string}
 */
export const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(neutraliseCsvText(value));
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert design output data to CSV format.
 * @param {Object} data - Design output data.
 * @returns {string} CSV formatted string.
 */
const convertToCSV = (data) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return '';
  }

  // Flatten nested objects
  const flattenObject = (obj, prefix = '') => {
    const flattened = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          flattened[newKey] = value
            .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
            .join('; ');
        } else {
          flattened[newKey] = value;
        }
      }
    }
    return flattened;
  };

  const flatData = flattenObject(data);
  const keys = Object.keys(flatData);
  const values = Object.values(flatData);

  if (keys.length === 0) {
    return '';
  }

  const header = keys.map(escapeCsvCell).join(',');
  const row = values.map(escapeCsvCell).join(',');

  return [header, row].join('\n');
};

/**
 * Export data to CSV (frontend-only, no API call).
 * @param {Object} data - Data to export.
 * @returns {{success: boolean, csvContent?: string, error?: string}}
 */
export const exportToCSV = async (data) => {
  try {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return { success: false, error: 'No data available to export' };
    }

    const csvContent = convertToCSV(data);
    if (!csvContent) {
      return { success: false, error: 'Failed to generate CSV. Data is empty.' };
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `design_output_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, csvContent };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

