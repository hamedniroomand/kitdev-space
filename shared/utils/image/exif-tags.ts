/**
 * Tag names and enumerated values for the TIFF blocks of EXIF.
 * The list holds the tags that a user reads, not the full specification.
 */

export const TIFF_TAG_NAMES: Record<number, string> = {
  0x0100: 'ImageWidth',
  0x0101: 'ImageHeight',
  0x0102: 'BitsPerSample',
  0x0103: 'Compression',
  0x0106: 'PhotometricInterpretation',
  0x010E: 'ImageDescription',
  0x010F: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011A: 'XResolution',
  0x011B: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'ModifyDate',
  0x013B: 'Artist',
  0x8298: 'Copyright',
  0x829A: 'ExposureTime',
  0x829D: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8827: 'ISO',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'ExposureCompensation',
  0x9205: 'MaxApertureValue',
  0x9206: 'SubjectDistance',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920A: 'FocalLength',
  0x927C: 'MakerNote',
  0x9286: 'UserComment',
  0xA001: 'ColorSpace',
  0xA002: 'PixelXDimension',
  0xA003: 'PixelYDimension',
  0xA402: 'ExposureMode',
  0xA403: 'WhiteBalance',
  0xA404: 'DigitalZoomRatio',
  0xA405: 'FocalLengthIn35mmFormat',
  0xA406: 'SceneCaptureType',
  0xA408: 'Contrast',
  0xA409: 'Saturation',
  0xA40A: 'Sharpness',
  0xA420: 'ImageUniqueID',
  0xA430: 'OwnerName',
  0xA431: 'SerialNumber',
  0xA432: 'LensInfo',
  0xA433: 'LensMake',
  0xA434: 'LensModel',
  0xA435: 'LensSerialNumber'
}

export const GPS_TAG_NAMES: Record<number, string> = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x0008: 'GPSSatellites',
  0x000C: 'GPSSpeedRef',
  0x000D: 'GPSSpeed',
  0x0010: 'GPSImgDirectionRef',
  0x0011: 'GPSImgDirection',
  0x001D: 'GPSDateStamp'
}

const ORIENTATION: Record<number, string> = {
  1: 'Normal',
  2: 'Mirror horizontal',
  3: 'Rotate 180°',
  4: 'Mirror vertical',
  5: 'Mirror horizontal and rotate 270°',
  6: 'Rotate 90°',
  7: 'Mirror horizontal and rotate 90°',
  8: 'Rotate 270°'
}

const RESOLUTION_UNIT: Record<number, string> = {
  1: 'None',
  2: 'Inches',
  3: 'Centimeters'
}

const EXPOSURE_PROGRAM: Record<number, string> = {
  0: 'Not defined',
  1: 'Manual',
  2: 'Program',
  3: 'Aperture priority',
  4: 'Shutter priority',
  5: 'Creative',
  6: 'Action',
  7: 'Portrait',
  8: 'Landscape'
}

const METERING_MODE: Record<number, string> = {
  0: 'Unknown',
  1: 'Average',
  2: 'Center weighted average',
  3: 'Spot',
  4: 'Multi spot',
  5: 'Multi segment',
  6: 'Partial'
}

const WHITE_BALANCE: Record<number, string> = {
  0: 'Auto',
  1: 'Manual'
}

const EXPOSURE_MODE: Record<number, string> = {
  0: 'Auto',
  1: 'Manual',
  2: 'Auto bracket'
}

const COLOR_SPACE: Record<number, string> = {
  1: 'sRGB',
  0xFFFF: 'Uncalibrated'
}

const SCENE_CAPTURE_TYPE: Record<number, string> = {
  0: 'Standard',
  1: 'Landscape',
  2: 'Portrait',
  3: 'Night'
}

const ENUMS: Record<string, Record<number, string>> = {
  Orientation: ORIENTATION,
  ResolutionUnit: RESOLUTION_UNIT,
  ExposureProgram: EXPOSURE_PROGRAM,
  MeteringMode: METERING_MODE,
  WhiteBalance: WHITE_BALANCE,
  ExposureMode: EXPOSURE_MODE,
  ColorSpace: COLOR_SPACE,
  SceneCaptureType: SCENE_CAPTURE_TYPE
}

/** Returns the readable name of an enumerated value, or null when there is none. */
export function enumLabel(tagName: string, value: number): string | null {
  return ENUMS[tagName]?.[value] ?? null
}

/** True when the tag can identify the camera, the owner, or the place. */
export function isPrivateTag(tagName: string): boolean {
  return tagName.startsWith('GPS')
    || tagName === 'Make'
    || tagName === 'Model'
    || tagName === 'Artist'
    || tagName === 'Copyright'
    || tagName === 'OwnerName'
    || tagName === 'SerialNumber'
    || tagName === 'LensSerialNumber'
    || tagName === 'ImageUniqueID'
    || tagName === 'UserComment'
    || tagName === 'Software'
    || tagName === 'MakerNote'
    || tagName === 'DateTimeOriginal'
    || tagName === 'DateTimeDigitized'
    || tagName === 'ModifyDate'
}
