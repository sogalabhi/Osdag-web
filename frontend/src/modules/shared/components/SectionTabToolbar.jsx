import React, { useCallback, useId, useRef, useState } from "react";
import { Button, Modal, message } from "antd";
import { isGuestUser } from "../../../utils/auth";
import {
  downloadSectionExportUser,
  downloadSectionTemplate,
  importSectionXlsx,
} from "../../../datasources/sectionsDataSource";
import { notifyCustomSectionAdded } from "../hooks/useModuleData";

const toolbarRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  justifyContent: "space-around",
  padding: "5px",
  borderTop: "1px solid #ccc",
};

/**
 * Section tools: template (guest OK), export/import/add (signed-in + unlocked), clear (local prefs).
 */
export default function SectionTabToolbar({
  sectionTable,
  isInputLocked = false,
  isGuest: isGuestProp,
  onRefetchModuleOptions,
  dropdownLists,
  onClearTab,
  onAddSection,
}) {
  const isGuest = isGuestProp !== undefined ? isGuestProp : isGuestUser();
  const inputId = useId();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(null);

  const canMutateSections = !isGuest && !isInputLocked;
  const canClearLocal = !isInputLocked;

  const runTemplateDownload = useCallback(async () => {
    setBusy("template");
    try {
      await downloadSectionTemplate(sectionTable);
      message.success("Template downloaded.");
    } catch (e) {
      message.error(e?.message || "Template download failed.");
    } finally {
      setBusy(null);
    }
  }, [sectionTable]);


  const handleAddClick = useCallback(async () => {
    if (onAddSection) {
      setBusy("add");
      await onAddSection();
      setBusy(null);
    }
  }, [onAddSection]);

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    try {
      const { data } = await importSectionXlsx(sectionTable, file);
      const inserted = data?.inserted ?? 0;
      const insertedDesignations = Array.isArray(data?.inserted_designations)
        ? data.inserted_designations
        : [];
      insertedDesignations.forEach((designation) =>
        notifyCustomSectionAdded({ table: sectionTable, designation })
      );
      const ignored = data?.ignored?.length ?? 0;
      const rejected = data?.rejected?.length ?? 0;
      await onRefetchModuleOptions?.();

      const listKeysByTable = {
        Columns: ["columnList", "sectionDesignation"],
        Beams: ["beamList", "sectionDesignation"],
        Angles: ["angleList", "topAngleList"],
        Channels: ["channelList"],
      };
      const verifyKeys = listKeysByTable[sectionTable] || [];
      const visibleList = verifyKeys.flatMap((key) =>
        Array.isArray(dropdownLists?.[key]) ? dropdownLists[key] : []
      );
      const isVisible = insertedDesignations.every((d) =>
        visibleList.some((v) => String(v) === String(d))
      );

      const summary = `Import finished: ${inserted} inserted, ${ignored} ignored, ${rejected} rejected.`;
      if (inserted > 0 && isVisible) {
        message.success(summary);
      } else if (inserted > 0 && !isVisible) {
        message.warning(`${summary} Saved, but dropdown sync is pending.`);
      } else if (inserted === 0 && (ignored > 0 || rejected > 0)) {
        message.warning(
          rejected > 0
            ? `${summary} No new rows were added. Fix rejected rows in the template and re-import.`
            : `${summary} No new rows were added.`
        );
      } else {
        message.info(summary);
      }
    } catch (err) {
      message.error(err?.message || "Import failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={toolbarRowStyle}>
      <Button
        style={{ minWidth: "140px" }}
        disabled={!canMutateSections || Boolean(busy)}
        onClick={handleAddClick}
      >
        Add
      </Button>
      <Button
        style={{ minWidth: "140px" }}
        disabled={!canClearLocal || Boolean(busy)}
        onClick={() => onClearTab?.()}
      >
        Clear
      </Button>
      <Button
        style={{ minWidth: "140px" }}
        disabled={!canMutateSections || Boolean(busy)}
        loading={busy === "import"}
        onClick={() => fileRef.current?.click()}
      >
        Import xlsx file
      </Button>
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        onChange={onFileSelected}
      />
      <Button
        style={{ minWidth: "140px" }}
        disabled={Boolean(busy)}
        loading={busy === "template"}
        onClick={() => void runTemplateDownload()}
      >
        Download xlsx file
      </Button>
      
    </div>
  );
}
