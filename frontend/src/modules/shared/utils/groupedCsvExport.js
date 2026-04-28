/**
 * Grouped CSV exporters for Inputs / Outputs.
 *
 * Format is intentionally human-readable (section header rows) rather than
 * a single flattened header row.
 */
import { triggerBrowserDownload } from "../../../datasources/sectionsDataSource";
import { isGuestUser } from "../../../utils/auth";

function escapeCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowsToCsv(rows) {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
}

function downloadCsvString(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, filename);
}

/**
 * Build grouped inputs CSV.
 *
 * - Uses moduleConfig.inputSections for "Basic Inputs" grouping (dock keys/labels).
 * - Adds an "Additional Inputs (Overrides)" section for designPrefOverrides entries.
 */
export function downloadGroupedInputsCsv({
  moduleConfig,
  inputs,
  effectiveInputs,
  designPrefOverrides,
  extraState,
  filename = "inputs.csv",
}) {
  const rows = [];
  rows.push(["Inputs"]);
  rows.push(["Section", "Label", "Key", "Value"]);

  for (const section of moduleConfig?.inputSections || []) {
    const title = section?.title || "Section";
    for (const field of section?.fields || []) {
      if (typeof field?.conditionalDisplay === "function") {
        try {
          if (!field.conditionalDisplay(extraState)) continue;
        } catch {
          // If conditional check fails, fall back to showing the field.
        }
      }
      const key = field?.key;
      const label = field?.label || key || "";
      const value = key ? (effectiveInputs?.[key] ?? inputs?.[key] ?? "") : "";
      rows.push([title, label, key || "", value]);
    }
  }

  const overrides = designPrefOverrides && typeof designPrefOverrides === "object" ? designPrefOverrides : {};
  const overrideKeys = Object.keys(overrides);
  rows.push([]);
  rows.push(["Additional Inputs (Overrides)"]);
  rows.push(["Key", "Value"]);
  if (overrideKeys.length === 0) {
    rows.push(["(none)", isGuestUser() ? "Guest mode" : "No overrides applied"]);
  } else {
    for (const k of overrideKeys.sort()) {
      rows.push([k, overrides[k]]);
    }
  }

  downloadCsvString(rowsToCsv(rows), filename);
  return { success: true };
}

/**
 * Build grouped outputs CSV with logs.
 *
 * Output config groups are taken from outputConfig.sections.
 */
export function downloadGroupedOutputsCsv({
  output,
  outputConfig,
  logs,
  filename = "outputs.csv",
}) {
  const rows = [];
  rows.push(["Outputs"]);
  rows.push(["Section", "Label", "Key", "Value"]);

  const out = output && output.data ? output.data : output;

  for (const [sectionName, fields] of Object.entries(outputConfig?.sections || {})) {
    for (const field of fields || []) {
      const key = field?.key;
      const label = field?.label || key || "";
      const value =
        key && out && out[key] && Object.prototype.hasOwnProperty.call(out[key], "val")
          ? out[key].val
          : key && out
            ? out[key]
            : "";
      rows.push([sectionName, label, key || "", value]);
    }
  }

  rows.push([]);
  rows.push(["Logs"]);
  rows.push(["Message"]);
  const logArr = Array.isArray(logs) ? logs : [];
  if (logArr.length === 0) {
    rows.push(["(none)"]);
  } else {
    for (const line of logArr) rows.push([line]);
  }

  downloadCsvString(rowsToCsv(rows), filename);
  return { success: true };
}

