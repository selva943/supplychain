import { TN_BOUNDS } from './geographicProjection';
import type { SCLocation, GeoValidationResult } from '../types/supplyChain';

/**
 * Validates whether latitude and longitude are valid numbers within global bounds.
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Checks whether coordinates fall within the Tamil Nadu geographic bounding box.
 * Note: External approved facilities may be located outside the mapped state.
 * may legally fall outside this bounding box.
 */
export function isWithinTamilNadu(lat: number, lon: number): boolean {
  if (!isValidCoordinate(lat, lon)) return false;
  return (
    lon >= TN_BOUNDS.minLon &&
    lon <= TN_BOUNDS.maxLon &&
    lat >= TN_BOUNDS.minLat &&
    lat <= TN_BOUNDS.maxLat
  );
}

/**
 * Validates a single supply chain location record.
 * Generates actionable warnings rather than silently discarding records.
 */
export function validateSCLocation(location: SCLocation): GeoValidationResult {
  const warnings: string[] = [];

  if (!location.id || location.id.trim() === '') {
    warnings.push('Location has missing or empty id.');
  }

  if (!location.code || location.code.trim() === '') {
    warnings.push('Location has missing or empty code.');
  }

  if (!location.name || location.name.trim() === '') {
    warnings.push('Location has missing or empty name.');
  }

  const valid = isValidCoordinate(location.latitude, location.longitude);
  if (!valid) {
    warnings.push(`Invalid geographic coordinates: lat=${location.latitude}, lon=${location.longitude}`);
    return {
      valid: false,
      withinTamilNadu: false,
      district: location.district,
      warnings,
    };
  }

  const withinTN = isWithinTamilNadu(location.latitude, location.longitude);
  if (!withinTN) {
    if (location.metadata?.outsideTN) {
      // Explicitly flagged facility outside the mapped state
      // This is expected and permissible
    } else {
      warnings.push(`Coordinates (${location.latitude}, ${location.longitude}) are outside Tamil Nadu bounding box.`);
    }
  }

  if (!location.district || location.district.trim() === '') {
    warnings.push('District is not specified or unassigned.');
  }

  return {
    valid: true,
    withinTamilNadu: withinTN,
    district: location.district,
    warnings,
  };
}
