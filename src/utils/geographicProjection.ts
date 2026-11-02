import * as THREE from 'three';

/**
 * Geographic projection utilities for Tamil Nadu 3D visualization.
 * 
 * Geographic bounding box:
 * Longitude: ~76.2334° E to 80.3464° E
 * Latitude:  ~8.0763° N to 13.5627° N
 * 
 * Center:
 * Lon: 78.2899° E, Lat: 10.8195° N
 */

export const TN_CENTER_LON = 78.2899;
export const TN_CENTER_LAT = 10.8195;

// Cosine of center latitude for conformal aspect ratio correction
export const COS_LAT_CENTER = Math.cos((TN_CENTER_LAT * Math.PI) / 180);

// Global scale factor mapping geographic degrees to 3D world scene units
export const MAP_SCALE = 3.6;

export const TN_BOUNDS = {
  minLon: 76.2334,
  maxLon: 80.3464,
  minLat: 8.0763,
  maxLat: 13.5627,
  widthDeg: 80.3464 - 76.2334,
  heightDeg: 13.5627 - 8.0763,
};

/**
 * Projects a [lon, lat] coordinate pair to 2D plane (x, y)
 * Suitable for Three.js Shape path generation.
 * In this 2D space: +x is East, +y is North.
 */
export function projectGeoTo2D(lon: number, lat: number): [number, number] {
  const x = (lon - TN_CENTER_LON) * COS_LAT_CENTER * MAP_SCALE;
  const y = (lat - TN_CENTER_LAT) * MAP_SCALE;
  return [x, y];
}

/**
 * Projects a [lon, lat] coordinate into 3D world space (X, Y, Z).
 * In 3D world space:
 * +X is East, -X is West
 * +Y is Up (Elevation)
 * -Z is North, +Z is South
 */
export function projectGeoToVector3(
  lon: number,
  lat: number,
  elevation = 0
): THREE.Vector3 {
  const x = (lon - TN_CENTER_LON) * COS_LAT_CENTER * MAP_SCALE;
  const z = -(lat - TN_CENTER_LAT) * MAP_SCALE;
  return new THREE.Vector3(x, elevation, z);
}

/**
 * Unprojects a 3D world (x, z) position back to approximate [lon, lat]
 */
export function unprojectVector3ToGeo(
  x: number,
  z: number
): [number, number] {
  const lon = x / (COS_LAT_CENTER * MAP_SCALE) + TN_CENTER_LON;
  const lat = -z / MAP_SCALE + TN_CENTER_LAT;
  return [lon, lat];
}
