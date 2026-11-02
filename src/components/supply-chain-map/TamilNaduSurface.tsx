import React, { useMemo } from 'react';
import * as THREE from 'three';

interface TamilNaduSurfaceProps {
  is3DExtruded?: boolean;
}

export const TamilNaduSurface: React.FC<TamilNaduSurfaceProps> = () => {
  // Ground grid lines
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(36, 36, '#183446', '#0c1a24');
    grid.position.y = -0.3;
    return grid;
  }, []);

  // Concentric radar circles for command center atmosphere
  const radarRings = useMemo(() => {
    const rings = [6, 12, 18, 24];
    return rings.map((radius) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, -0.28, p.y));
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      return geom;
    });
  }, []);

  // Soft pedestal plate under Tamil Nadu
  const pedestalGeom = useMemo(() => {
    return new THREE.CylinderGeometry(15, 15.5, 0.25, 48);
  }, []);

  return (
    <group name="TamilNaduSurface">
      {/* Background grid */}
      <primitive object={gridHelper} />

      {/* Atmospheric radar circles */}
      {radarRings.map((geom, idx) => (
        <primitive
          key={`radar-ring-${idx}`}
          object={
            new THREE.LineLoop(
              geom,
              new THREE.LineBasicMaterial({
                color: '#1a3a48',
                transparent: true,
                opacity: 0.25,
              })
            )
          }
        />
      ))}

      {/* Command center base pedestal plate */}
      <mesh
        geometry={pedestalGeom}
        position={[0, -0.35, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#060f17"
          roughness={0.8}
          metalness={0.3}
          emissive="#03080e"
        />
      </mesh>

      {/* Subtle outer glow ring around pedestal */}
      <mesh position={[0, -0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.8, 15.1, 64]} />
        <meshBasicMaterial
          color="#1e4d58"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
