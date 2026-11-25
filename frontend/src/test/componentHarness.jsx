/**
 * Helpers for the component tests (`*.test.jsx`, jsdom): a stateful host for the Additional Inputs tabs
 * and finders for the Ant Design selects the tabs are made of.
 */
import { fireEvent, screen, within } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { useState } from "react";

/**
 * Makes Ant Design render every dropdown inside the element of its select. By default a dropdown goes to
 * <body> and stays there after it closes (jsdom has no transitions), so two selects could not be told apart.
 */
export const InPlace = ({ children }) => (
  <ConfigProvider getPopupContainer={(trigger) => trigger?.parentElement ?? document.body}>{children}</ConfigProvider>
);

/**
 * Holds `designPrefInputs` the way the dialog does and shows it as JSON in an <output>, so a test can
 * click a control and read what the tab wrote back. `props` go to the tab as they are.
 */
export function PrefTabHost({ Tab, initial, ...props }) {
  const [designPrefInputs, setDesignPrefInputs] = useState(initial);
  return (
    <InPlace>
      <Tab {...props} designPrefInputs={designPrefInputs} setDesignPrefInputs={setDesignPrefInputs} />
      <output data-testid="prefs">{JSON.stringify(designPrefInputs)}</output>
    </InPlace>
  );
}

/** The inputs the host holds now. */
export const prefsNow = () => JSON.parse(screen.getByTestId("prefs").textContent);

const clean = (text) => text.replace(/\s+/g, " ").trim();

/** The labels (h5) of the rows on screen. */
export const rowLabels = () => screen.queryAllByRole("heading", { level: 5 }).map((h) => clean(h.textContent));

/** The `.input-cont` row whose label (h5) starts with `label`. */
export function row(label) {
  const heading = screen.queryAllByRole("heading", { level: 5 }).find((h) => clean(h.textContent).startsWith(label));
  if (!heading) throw new Error(`no row labelled "${label}" among ${JSON.stringify(rowLabels())}`);
  return heading.closest(".input-cont");
}

/** The Ant Design select of a row, and the text it shows. */
const selectOf = (label) => within(row(label)).getByRole("combobox").closest(".ant-select");
export const shownIn = (label) => selectOf(label).querySelector(".ant-select-content")?.textContent ?? "";
export const isSelectDisabled = (label) => selectOf(label).classList.contains("ant-select-disabled");

/** The option elements of a row's dropdown (it renders inside the row, see `InPlace`). */
const optionsInRow = (label) => [...row(label).querySelectorAll(".ant-select-item-option")];

/** Opens the select of a row and lists its options as { text, disabled } (empty when it did not open). */
export function optionsOf(label) {
  fireEvent.mouseDown(selectOf(label));
  return optionsInRow(label).map((option) => ({
    text: option.textContent,
    disabled: option.classList.contains("ant-select-item-option-disabled"),
  }));
}

/** Picks an option of a row's select by its text (a disabled option is clicked all the same). */
export function pick(label, text) {
  const options = optionsOf(label);
  if (!options.some((option) => option.text === text)) {
    throw new Error(`"${label}" has no option "${text}": ${JSON.stringify(options)}`);
  }
  fireEvent.click(optionsInRow(label).find((option) => option.textContent === text));
}

/** The text input of a row. */
export const textInputOf = (label) => within(row(label)).getByRole("textbox");
