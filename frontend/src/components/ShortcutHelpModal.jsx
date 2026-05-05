import { useMemo, useState } from "react";
import { Modal } from "antd";
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_ACTION_BY_ID,
} from "../constants/shortcuts";
import { useShortcutLayer } from "../utils/shortcuts/ShortcutProvider";

const SCOPE_LABELS = {
  global: "Global",
  engineering: "Engineering Module",
  moduleSelection: "Module Selection",
  modal: "Modal Context",
};

const scopeOrder = ["global", "engineering", "moduleSelection", "modal"];

const formatCombos = (shortcuts = {}) => {
  const winLinux = (shortcuts.winLinux || []).join(" / ") || "-";
  const mac = (shortcuts.mac || []).join(" / ") || "-";
  return { winLinux, mac };
};

const buildSections = () => {
  const visibleActions = SHORTCUT_ACTIONS.filter(
    (action) => action.shortcuts && ((action.shortcuts.winLinux || []).length || (action.shortcuts.mac || []).length)
  );

  const byScope = {};
  visibleActions.forEach((action) => {
    if (!byScope[action.scope]) byScope[action.scope] = [];
    byScope[action.scope].push(action);
  });

  return byScope;
};

const ShortcutHelpModal = () => {
  const [open, setOpen] = useState(false);

  useShortcutLayer({
    id: "global-shortcut-help-open",
    priority: 20,
    enabled: !open,
    bindings: [
      {
        combos: SHORTCUT_ACTION_BY_ID["global.shortcuts.help"]?.shortcuts,
        handler: () => setOpen(true),
      },
    ],
  });

  useShortcutLayer({
    id: "global-shortcut-help-modal",
    priority: 200,
    enabled: open,
    blockLower: true,
    bindings: [
      {
        combos: SHORTCUT_ACTION_BY_ID["global.dismiss"]?.shortcuts || {
          winLinux: ["Escape"],
          mac: ["Escape"],
        },
        handler: () => setOpen(false),
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["global.shortcuts.help"]?.shortcuts,
        handler: () => setOpen(false),
      },
    ],
  });

  const sections = useMemo(() => buildSections(), []);

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      width={900}
      title="Keyboard Shortcuts"
      className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-5">
        {scopeOrder.map((scopeKey) => {
          const actions = sections[scopeKey];
          if (!actions?.length) return null;
          return (
            <section key={scopeKey} className="space-y-3">
              <h3 className="text-base font-semibold">{SCOPE_LABELS[scopeKey] || scopeKey}</h3>
              <div className="border rounded-md p-3">
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-semibold py-2 pr-3">Action</th>
                          <th className="text-left font-semibold py-2 pr-3">Win/Linux</th>
                          <th className="text-left font-semibold py-2">Mac</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actions.map((action) => {
                          const combos = formatCombos(action.shortcuts);
                          return (
                            <tr key={action.id} className="border-b last:border-b-0 align-top">
                              <td className="py-2 pr-3 font-medium">{action.label}</td>
                              <td className="py-2 pr-3">{combos.winLinux}</td>
                              <td className="py-2">{combos.mac}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </Modal>
  );
};

export default ShortcutHelpModal;

