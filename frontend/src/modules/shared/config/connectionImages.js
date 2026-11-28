import FRM from "../../../assets/flush_ep.png";
import EOWIM from "../../../assets/owe_ep.png";
import EBWRM from "../../../assets/extended.png";
import CFBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cf_bw.png";
import CWBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cw_bw.png";
import BB from "../../../assets/ShearConnection/sc_fin_plate/fin_beam_beam.png";
import BC_CF_BW_FLUSH from "../../../assets/BC_CF-BW-Flush.png";
import BC_CF_BW_EOW from "../../../assets/BC_CF-BW-EOW.png";
import BC_CF_BW_EBW from "../../../assets/BC_CF-BW-EBW.png";
import BC_CW_BW_FLUSH from "../../../assets/BC_CW-BW-Flush.png";
import BC_CW_BW_EOW from "../../../assets/BC_CW-BW-EOW.png";
import BC_CW_BW_EBW from "../../../assets/BC_CW-BW-EBW.png";
import ErrorImg from "../../../assets/notSelected.png";
import { CONN_CFBW, CONN_CWBW } from "../../../constants/generated/coreKeys";

// Pictures of the shear connection connectivities, by connectivity.
const CONNECTIVITY_IMAGES = {
  [CONN_CFBW]: CFBW,
  [CONN_CWBW]: CWBW,
  "Beam-Beam": BB,
};

// Pictures of the end plate types, by end plate type.
const END_PLATE_TYPE_IMAGES = {
  "Flushed - Reversible Moment": FRM,
  "Extended One Way - Irreversible Moment": EOWIM,
  "Extended Both Ways - Reversible Moment": EBWRM,
};

// Beam-to-column end plate pictures, by connectivity then end plate type.
const BEAM_COLUMN_END_PLATE_IMAGES = {
  [CONN_CFBW]: {
    "Flushed - Reversible Moment": BC_CF_BW_FLUSH,
    "Extended One Way - Irreversible Moment": BC_CF_BW_EOW,
    "Extended Both Ways - Reversible Moment": BC_CF_BW_EBW,
  },
  [CONN_CWBW]: {
    "Flushed - Reversible Moment": BC_CW_BW_FLUSH,
    "Extended One Way - Irreversible Moment": BC_CW_BW_EOW,
    "Extended Both Ways - Reversible Moment": BC_CW_BW_EBW,
  },
};

/**
 * `imageSource(extraState, inputs)` of a connectivity field: the picture of the selected
 * connectivity, the "not selected" picture for an unknown one, nothing before a choice exists.
 */
export const connectivityImage = (extraState, inputs) => {
  const selected = inputs?.connectivity;
  if (!selected) return null;
  return CONNECTIVITY_IMAGES[selected] || ErrorImg;
};

/**
 * `imageSource(extraState, inputs)` of the end plate type field of the beam-to-column end plate:
 * the picture for the connectivity and the end plate type, else the picture of the type alone.
 */
export const beamColumnEndPlateImage = (extraState, inputs) => {
  const selected = inputs?.endPlateType;
  if (!selected) return null;
  const connectivity = inputs?.connectivity;
  return (
    (connectivity ? BEAM_COLUMN_END_PLATE_IMAGES[connectivity]?.[selected] : null) ||
    END_PLATE_TYPE_IMAGES[selected] ||
    ErrorImg
  );
};

/**
 * `imageSource(extraState, inputs)` of the end plate type field of the beam-to-beam end plate:
 * the picture of the selected end plate type.
 */
export const endPlateTypeImage = (extraState, inputs) => {
  const selected = inputs?.endPlateType;
  if (!selected) return null;
  return END_PLATE_TYPE_IMAGES[selected] || ErrorImg;
};
