/**
 * Grouped CSV exporters for Inputs / Outputs.
 *
 * Human-readable sections with Label and Value columns.
 */
import { triggerBrowserDownload } from "../../../datasources/sectionsDataSource";
import { isGuestUser } from "../../../utils/auth";
import { escapeCsvCell } from "../../../utils/csvUtils";
import { toDesignDictionary } from "./osiSave";

function extractLogMessage(line) {
  if (line === null || line === undefined) return "";
  if (typeof line === "string") return line;
  if (typeof line === "object") {
    return line.message || line.msg || line.text || line.log || line.detail || JSON.stringify(line);
  }
  return String(line);
}

function extractOutputValue(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "object") {
    if ("val" in item) return item.val ?? "";
    if ("value" in item) return item.value ?? "";
    return JSON.stringify(item);
  }
  return item;
}

function extractOutputLabel(field, outItem) {
  if (field?.label) return field.label;
  if (outItem && typeof outItem === "object" && outItem.label) return outItem.label;
  if (field?.key) return field.key;
  return "";
}

function escapeCell(value) {
  if (value !== null && value !== undefined && typeof value === "object") {
    return escapeCsvCell(extractLogMessage(value));
  }
  return escapeCsvCell(value);
}

function rowsToCsv(rows) {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

function downloadCsvString(csvString, filename) {
  // UTF-8 BOM (\uFEFF) ensures Excel and spreadsheet viewers handle quotes, commas, and UTF-8 characters correctly
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, filename);
}

/**
 * The value of every dock field as the design request carries it.
 *
 * The request is built exactly as the Design button and the `.osi` save build it (`toDesignDictionary`),
 * so a field that holds a typed value while its "All" flag is set shows the typed value, and an "All"
 * selection shows the list the request sends. A field is read from the first core key it declares that
 * the request carries; a field the request does not carry keeps the form's value. The Additional Inputs
 * overrides are merged in as they are in the request.
 */
export function inputsAsRequested({ moduleConfig, inputs, allSelected, contextData, extraState, designPrefOverrides }) {
  const prefs = designPrefOverrides && typeof designPrefOverrides === "object" ? designPrefOverrides : {};
  const values = { ...inputs, ...prefs };
  const dictionary = toDesignDictionary({
    moduleConfig, inputs, allSelected, contextData, extraState, designPrefOverrides: prefs,
  });
  for (const section of moduleConfig?.inputSections || []) {
    for (const field of section?.fields || []) {
      const declared = field?.key ? moduleConfig?.coreKeys?.[field.key] : null;
      if (declared == null) continue;
      const coreKey = [].concat(declared).find((k) => dictionary[k] !== undefined && dictionary[k] !== null);
      if (coreKey !== undefined) values[field.key] = dictionary[coreKey];
    }
  }
  return values;
}

/**
 * The rows of the grouped inputs CSV: the dock sections (label and value), then the Additional Inputs overrides.
 * `effectiveInputs` holds the value of each field (see `inputsAsRequested`); `inputs` is the fallback.
 */
export function groupedInputsRows({ moduleConfig, inputs, effectiveInputs, designPrefOverrides, extraState }) {
  const rows = [];
  rows.push(["Inputs"]);
  rows.push(["Section", "Label", "Value"]);

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
      let rawVal = key ? (effectiveInputs?.[key] ?? inputs?.[key] ?? "") : "";
      if (Array.isArray(rawVal)) {
        rawVal = rawVal.join(", ");
      }
      rows.push([title, label, rawVal]);
    }
  }

  const overrides = designPrefOverrides && typeof designPrefOverrides === "object" ? designPrefOverrides : {};
  const overrideKeys = Object.keys(overrides);
  rows.push([]);
  rows.push(["Additional Inputs (Overrides)"]);
  rows.push(["Label", "Value"]);
  if (overrideKeys.length === 0) {
    rows.push(["(none)", isGuestUser() ? "Guest mode" : "No overrides applied"]);
  } else {
    for (const k of overrideKeys.sort()) {
      let val = overrides[k];
      if (Array.isArray(val)) val = val.join(", ");
      rows.push([k, val]);
    }
  }
  return rows;
}

/**
 * Build grouped inputs CSV.
 */
export function downloadGroupedInputsCsv({
  moduleConfig,
  inputs,
  effectiveInputs,
  designPrefOverrides,
  extraState,
  filename = "inputs.csv",
}) {
  const rows = groupedInputsRows({ moduleConfig, inputs, effectiveInputs, designPrefOverrides, extraState });
  downloadCsvString(rowsToCsv(rows), filename);
  return { success: true };
}

/**
 * Build grouped outputs CSV with logs (readable, section-grouped format).
 */
export function downloadGroupedOutputsCsv({
  output,
  outputLayout,
  logs,
  filename = "outputs.csv",
}) {
  const rows = [];
  rows.push(["Outputs"]);
  rows.push(["Section", "Label", "Value"]);

  const out = output && output.data ? output.data : (output || {});
  const processedKeys = new Set();

  // The dock's own sections and fields come first, in the engine's order.
  for (const section of outputLayout || []) {
    if (section.visible === false) continue;
    for (const item of section.items || []) {
      if (item.type !== "field" || item.visible === false) continue;
      processedKeys.add(item.key);
      if (item.label || item.value !== "") {
        rows.push([section.title, item.label, item.value]);
      }
    }
  }

  // Include any remaining keys from `out` that are not in the dock layout
  if (out && typeof out === "object") {
    for (const [key, item] of Object.entries(out)) {
      if (processedKeys.has(key)) continue;
      if (key === "success" || key === "status" || key === "logs") continue;
      const label = extractOutputLabel(null, item);
      const value = extractOutputValue(item);
      if (label || value !== "") {
        rows.push(["Output", label, value]);
      }
    }
  }

  const logArr = Array.isArray(logs) ? logs : [];
  if (logArr.length > 0) {
    rows.push([]);
    rows.push(["Logs"]);
    rows.push(["Log Message"]);
    for (const line of logArr) {
      const msg = extractLogMessage(line);
      if (msg) rows.push([msg]);
    }
  }

  downloadCsvString(rowsToCsv(rows), filename);
  return { success: true };
}

function stringifyRawCsvValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return value;
}

/**
 * Build a combined inputs+outputs CSV: one file, no header row, raw
 * internal key names (not display labels), positionally paired
 * input/output rows (blank-padded when counts differ).
 */
export function downloadRawOutputsCsv({
  inputsDict,
  rawCsvData,
  // eslint-disable-next-line no-restricted-syntax -- file name, not a key
  filename = "Outputs.csv",
}) {
  const inputEntries = Object.entries(inputsDict || {});
  const outputEntries = Object.entries(rawCsvData || {});
  const rowCount = Math.max(inputEntries.length, outputEntries.length);

  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const [inKey, inVal] = inputEntries[i] || ["", ""];
    const [outKey, outVal] = outputEntries[i] || ["", ""];
    rows.push([inKey, stringifyRawCsvValue(inVal), outKey, stringifyRawCsvValue(outVal)]);
  }

  downloadCsvString(rowsToCsv(rows), filename);
  return { success: true };
}
