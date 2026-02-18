import { apiClient } from "../utils/apiClient";
import { REPORTS } from "./endpoints";

/**
 * Generate initial report with metadata, module info and inputs.
 */
export async function generateInitialReport(reportData) {
  const res = await apiClient(REPORTS.generateInitial, {
    method: "POST",
    body: JSON.stringify(reportData),
  });
  const result = await res.json();
  if (result.success) {
    return {
      success: true,
      report_id: result.report_id,
      sections: result.sections,
    };
  }
  return { success: false, error: result.error || "Failed to generate report" };
}

/**
 * Customize report and generate PDF blob.
 */
export async function customizeReport(reportId, selectedSections) {
  const res = await apiClient(REPORTS.customize, {
    method: "POST",
    body: JSON.stringify({
      report_id: reportId,
      selected_sections: selectedSections,
    }),
  });
  const blob = await res.blob();
  return { success: true, blob };
}

