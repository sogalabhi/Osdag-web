"""
OCC CAD export helpers.

These functions export an in-memory OCC TopoDS_Shape to the requested file format.
Adapters should call these helpers for on-demand exports.
"""

import os


def _ensure_parent_dir(path: str) -> None:
    parent = os.path.dirname(path)
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


def export_step(shape, out_path: str) -> str:
    """Export `shape` to STEP (.step)."""
    from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs

    _ensure_parent_dir(out_path)

    step_writer = STEPControl_Writer()
    step_writer.Transfer(shape, STEPControl_AsIs)
    ok = step_writer.Write(out_path) == 1
    if not ok:
        raise RuntimeError(f"Failed to write STEP file: {out_path}")
    return out_path


def export_iges(shape, out_path: str) -> str:
    """Export `shape` to IGES (.iges)."""
    from OCC.Core.IGESControl import IGESControl_Writer

    _ensure_parent_dir(out_path)

    iges_writer = IGESControl_Writer()
    iges_writer.AddShape(shape)
    ok = iges_writer.Write(out_path) == 1
    if not ok:
        raise RuntimeError(f"Failed to write IGES file: {out_path}")
    return out_path

