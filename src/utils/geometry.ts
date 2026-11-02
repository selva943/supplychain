import * as THREE from 'three';
import type { DistrictGeometry } from '../types/map';
import { projectGeoTo2D, projectGeoToVector3 } from './geographicProjection';

/**
 * Creates Three.js Shapes from GeoJSON Polygon or MultiPolygon.
 * Handles outer boundaries and interior holes correctly.
 */
export function createDistrictShapes(geometry: DistrictGeometry): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];

  if (geometry.type === 'Polygon') {
    const polygonRings = geometry.coordinates as number[][][];
    if (polygonRings.length === 0 || polygonRings[0].length < 3) return shapes;

    const outerRing = polygonRings[0];
    const shape = new THREE.Shape();

    const [firstX, firstY] = projectGeoTo2D(outerRing[0][0], outerRing[0][1]);
    shape.moveTo(firstX, firstY);

    for (let i = 1; i < outerRing.length; i++) {
      const [x, y] = projectGeoTo2D(outerRing[i][0], outerRing[i][1]);
      shape.lineTo(x, y);
    }

    // Process interior holes
    for (let h = 1; h < polygonRings.length; h++) {
      const holeRing = polygonRings[h];
      if (holeRing.length < 3) continue;

      const holePath = new THREE.Path();
      const [hX, hY] = projectGeoTo2D(holeRing[0][0], holeRing[0][1]);
      holePath.moveTo(hX, hY);

      for (let j = 1; j < holeRing.length; j++) {
        const [x, y] = projectGeoTo2D(holeRing[j][0], holeRing[j][1]);
        holePath.lineTo(x, y);
      }
      shape.holes.push(holePath);
    }

    shapes.push(shape);
  } else if (geometry.type === 'MultiPolygon') {
    const multiPolygons = geometry.coordinates as number[][][][];

    for (const polygonRings of multiPolygons) {
      if (polygonRings.length === 0 || polygonRings[0].length < 3) continue;

      const outerRing = polygonRings[0];
      const shape = new THREE.Shape();

      const [firstX, firstY] = projectGeoTo2D(outerRing[0][0], outerRing[0][1]);
      shape.moveTo(firstX, firstY);

      for (let i = 1; i < outerRing.length; i++) {
        const [x, y] = projectGeoTo2D(outerRing[i][0], outerRing[i][1]);
        shape.lineTo(x, y);
      }

      for (let h = 1; h < polygonRings.length; h++) {
        const holeRing = polygonRings[h];
        if (holeRing.length < 3) continue;

        const holePath = new THREE.Path();
        const [hX, hY] = projectGeoTo2D(holeRing[0][0], holeRing[0][1]);
        holePath.moveTo(hX, hY);

        for (let j = 1; j < holeRing.length; j++) {
          const [x, y] = projectGeoTo2D(holeRing[j][0], holeRing[j][1]);
          holePath.lineTo(x, y);
        }
        shape.holes.push(holePath);
      }

      shapes.push(shape);
    }
  }

  return shapes;
}

/**
 * Generates line coordinate arrays for district boundary outlines in 3D world space.
 */
export function createDistrictBoundaryRings(
  geometry: DistrictGeometry,
  elevation = 0.04
): THREE.Vector3[][] {
  const rings: THREE.Vector3[][] = [];

  const processRings = (ringCoords: number[][][]) => {
    for (const ring of ringCoords) {
      if (ring.length < 3) continue;
      const points: THREE.Vector3[] = [];
      for (const pt of ring) {
        points.push(projectGeoToVector3(pt[0], pt[1], elevation));
      }
      rings.push(points);
    }
  };

  if (geometry.type === 'Polygon') {
    processRings(geometry.coordinates as number[][][]);
  } else if (geometry.type === 'MultiPolygon') {
    const multiPolys = geometry.coordinates as number[][][][];
    for (const poly of multiPolys) {
      processRings(poly);
    }
  }

  return rings;
}

/**
 * Creates a curved 3D Quadratic Bezier route between two 3D positions with gentle elevation arc.
 */
export function createArcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  maxArcHeight = 1.2
): THREE.QuadraticBezierCurve3 {
  const distance = start.distanceTo(end);
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  // Arc height proportional to distance, with a reasonable floor and ceiling
  const arcHeight = Math.min(Math.max(distance * 0.18, 0.4), maxArcHeight);
  midPoint.y = Math.max(start.y, end.y) + arcHeight;

  return new THREE.QuadraticBezierCurve3(start, midPoint, end);
}
