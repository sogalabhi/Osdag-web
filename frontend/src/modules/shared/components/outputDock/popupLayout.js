/**
 * Sorts a popup's rows the way the desktop popup lays them out: notes first, then one block per
 * section (title, fields, images). Rows before the first section are only shown when the popup
 * has no sections at all.
 */
export const arrangePopup = (rows) => {
  const notes = [];
  const blocks = [];
  let current = { title: null, image: null, fields: [], images: [] };
  let sawSection = false;

  for (const row of rows || []) {
    if (row.type === "note") {
      notes.push(row.text);
    } else if (row.type === "section") {
      if (sawSection) blocks.push(current);
      current = { title: row.title, image: row.image || null, fields: [], images: [] };
      sawSection = true;
    } else if (row.type === "field" || row.type === "label") {
      current.fields.push(row);
    } else if (row.type === "image") {
      current.images.push(row);
    }
  }
  if (sawSection || current.fields.length > 0 || current.images.length > 0) blocks.push(current);
  return { notes, blocks };
};

/** The widest image in a popup, used to size its window. */
export const widestPopupImage = (rows) =>
  (rows || []).reduce((widest, row) => {
    const image = row.type === "section" ? row.image : row.type === "image" ? row : null;
    return image ? Math.max(widest, image.width) : widest;
  }, 0);
