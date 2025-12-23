// Centralized API route mappings for engineering modules.
export const MODULE_SLUGS = {
  // Shear
  FinPlateConnection: 'shear-connection/fin-plate',
  CleatAngleConnection: 'shear-connection/cleat-angle',
  EndPlateConnection: 'shear-connection/end-plate',
  SeatedAngleConnection: 'shear-connection/seated-angle',
  // Moment
  CoverPlateBolted: 'moment-connection/beam-beam-cover-plate-bolted',
  'Beam-to-Beam-Cover-Plate-Bolted-Connection': 'moment-connection/beam-beam-cover-plate-bolted',
  'Cover-Plate-Bolted-Connection': 'moment-connection/beam-beam-cover-plate-bolted',
  CoverPlateWelded: 'moment-connection/beam-beam-cover-plate-welded',
  'Beam-to-Beam-Cover-Plate-Welded-Connection': 'moment-connection/beam-beam-cover-plate-welded',
  'Cover-Plate-Welded-Connection': 'moment-connection/beam-beam-cover-plate-welded',
  BeamBeamEndPlate: 'moment-connection/beam-beam-end-plate',
  'Beam-Beam-End-Plate-Connection': 'moment-connection/beam-beam-end-plate',
  BeamColumnEndPlate: 'moment-connection/beam-column-end-plate',
  'Beam-to-Column-End-Plate-Connection': 'moment-connection/beam-column-end-plate',
  CCCoverPlateBolted: 'moment-connection/column-column-cover-plate-bolted',
  ColumnCoverPlateBolted: 'moment-connection/column-column-cover-plate-bolted',
  'Column-to-Column-Cover-Plate-Bolted-Connection': 'moment-connection/column-column-cover-plate-bolted',
  CCCoverPlateWelded: 'moment-connection/column-column-cover-plate-welded',
  'Column-to-Column-Cover-Plate-Welded-Connection': 'moment-connection/column-column-cover-plate-welded',
  CCEndPlate: 'moment-connection/column-column-end-plate',
  'Column-to-Column-End-Plate-Connection': 'moment-connection/column-column-end-plate',
  // Simple
  ButtJointBolted: 'simple-connection/butt-joint-bolted',
  ButtJointWelded: 'simple-connection/butt-joint-welded',
  LapJointBolted: 'simple-connection/lap-joint-bolted',
  LapJointWelded: 'simple-connection/lap-joint-welded',
  // Tension
  'Tension-Member-Bolted-Design': 'tension-member/bolted',
  'Tension-Member-Welded-Design': 'tension-member/welded',
  BoltedToEndGusset: 'tension-member/bolted',
  WeldedToEndGusset: 'tension-member/welded',
  // Flexure
  'Simply-Supported-Beam': 'flexure-member/simply-supported-beam',
};

