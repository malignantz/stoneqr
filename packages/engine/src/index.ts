export * from './types.js';
export { encode, EncodeError, sizeForVersion, minimumVersion } from './encode.js';
export { renderSvg, matrixToPath, escapeXml, type SvgOptions } from './render/svg.js';
export { rasterize, type RasterOptions } from './raster.js';
export { verifyRaster, verifyRasterAsync, verifyImageData, type VerifyResult } from './verify.js';
export { paperColor, MODULE_MM_WARN, MODULE_MM_GOOD, CONTRAST_MIN, LOGO_WARN_RATIO, LOGO_BLOCK_RATIO, SCAN_SAFETY, moduleMm, maxScanDistanceM, minWidthMmForDistance, minWidthMmForModule, toMm, fromMm, parseColor, relativeLuminance, contrastRatio, isInverted, isReddish, formatMm, assess, statusFor, summary, type LengthUnit, type SizingInput, type SizingStatus } from './sizing.js';
export * from './payloads/index.js';
export { crc32, physChunk, setPngDpi, encodePng, exportPng, parseRgb, type PngExportOptions, type PngExportResult } from './export/png.js';
export { exportEps, mergedRuns, type EpsOptions, type ModuleRun } from './export/eps.js';
// PDF exports (pdf-lib) stay on the "./export/pdf" subpath so the core bundle stays small.
// Label sheets (pdf-lib) stay on the "./labels" subpath for the same reason.
export { renderHalftone, halftoneVersionFor, halftoneWithFallback, DOT_SCALE_MIN, DOT_SCALE_MAX, HALFTONE_MIN_MODULES, type HalftoneOptions, type HalftoneResult } from './render/halftone.js';
