/**
 * Default options and configuration values for ts-potrace
 */

// Default threshold values
export const DEFAULT_THRESHOLD = 128
export const THRESHOLD_AUTO = -1
export const THRESHOLD_CUSTOM = -2

// Range distribution types
export const RANGES_AUTO = 'auto'
export const RANGES_EQUAL = 'equal'

// Default options for Potrace
export const DEFAULT_POTRACE_OPTIONS = {
  threshold: DEFAULT_THRESHOLD,
  blackOnWhite: true,
  optTolerance: 0.2,
  turdSize: 2,
  turnPolicy: 'minority',
  alphaMax: 1,
  optiCurve: true,
  optCurve: true, // Alias for optiCurve
  color: '#000',
  background: 'transparent',
}

// Default options for Posterizer
export const DEFAULT_POSTERIZER_OPTIONS = {
  threshold: DEFAULT_THRESHOLD,
  blackOnWhite: true,
  steps: 4,
  rangeDistribution: RANGES_AUTO,
  optTolerance: 0.2,
  turdSize: 2,
  turnPolicy: 'minority',
  alphaMax: 1,
  optiCurve: true,
  optCurve: true, // Alias for optiCurve
  color: '#000',
  background: 'transparent',
  opacity: 1,
  fill: true,
}
