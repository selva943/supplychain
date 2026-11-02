import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type {
  DistrictFeature,
  DistrictProperties,
  SelectedEntity,
} from '../../types/map';
import { createDistrictShapes, createDistrictBoundaryRings } from '../../utils/geometry';
import { projectGeoToVector3 } from '../../utils/geographicProjection';
import { THEME } from '../../theme/colors';

interface DistrictLayerProps {
  districts: DistrictFeature[];
  selectedEntity: SelectedEntity;
  hoveredEntity: SelectedEntity;
  showBoundaries: boolean;
  showLabels: boolean;
  is3DExtruded: boolean;
  onSelectDistrict: (district: DistrictProperties) => void;
  onHoverDistrict: (district: DistrictProperties | null) => void;
}

interface SingleDistrictMeshProps {
  feature: DistrictFeature;
  isSelected: boolean;
  isHovered: boolean;
  showBoundaries: boolean;
  showLabels: boolean;
  is3DExtruded: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

const SingleDistrictMesh: React.FC<SingleDistrictMeshProps> = React.memo(
  ({
    feature,
    isSelected,
    isHovered,
    showBoundaries,
    showLabels,
    is3DExtruded,
    onSelect,
    onHover,
  }) => {
    const { properties, geometry } = feature;

    // Memoize 2D shapes
    const shapes = useMemo(() => {
      return createDistrictShapes(geometry);
    }, [geometry]);

    // Extrusion settings based on selection state
    const extrudeSettings = useMemo(() => {
      const depth = is3DExtruded
        ? isSelected
          ? 0.42
          : isHovered
          ? 0.32
          : 0.18
        : 0.04;

      return {
        depth,
        bevelEnabled: is3DExtruded,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      };
    }, [is3DExtruded, isSelected, isHovered]);

    // Create extruded geometry
    const extrudeGeometries = useMemo(() => {
      return shapes.map((shape) => new THREE.ExtrudeGeometry(shape, extrudeSettings));
    }, [shapes, extrudeSettings]);

    // Memoize boundary line vectors
    const boundaryRings = useMemo(() => {
      if (!showBoundaries) return [];
      const elev = is3DExtruded ? (isSelected ? 0.48 : isHovered ? 0.38 : 0.22) : 0.06;
      return createDistrictBoundaryRings(geometry, elev);
    }, [geometry, showBoundaries, is3DExtruded, isSelected, isHovered]);

    // District center for label positioning
    const centerPos = useMemo(() => {
      const [lon, lat] = properties.center;
      const elev = is3DExtruded ? (isSelected ? 0.6 : isHovered ? 0.5 : 0.32) : 0.15;
      return projectGeoToVector3(lon, lat, elev);
    }, [properties.center, is3DExtruded, isSelected, isHovered]);

    // Dynamic surface material color
    const surfaceColor = useMemo(() => {
      if (isSelected) return THEME.mapSurfaceSelected;
      if (isHovered) return THEME.mapSurfaceHover;
      return THEME.mapSurface;
    }, [isSelected, isHovered]);

    const boundaryColor = useMemo(() => {
      if (isSelected) return THEME.boundaryHighlight;
      if (isHovered) return THEME.infoBlue;
      return THEME.districtBoundary;
    }, [isSelected, isHovered]);

    return (
      <group>
        {/* District Extruded Mesh */}
        {extrudeGeometries.map((geom, idx) => (
          <mesh
            key={`geom-${idx}`}
            geometry={geom}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
              onHover(true);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'auto';
              onHover(false);
            }}
          >
            <meshStandardMaterial
              color={surfaceColor}
              roughness={0.45}
              metalness={0.25}
              emissive={isSelected ? '#103940' : isHovered ? '#0d2830' : '#051118'}
              emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.4 : 0.15}
            />
          </mesh>
        ))}

        {/* Boundary Lines */}
        {showBoundaries &&
          boundaryRings.map((ringPoints, rIdx) => {
            const lineGeom = new THREE.BufferGeometry().setFromPoints(ringPoints);
            return (
              <primitive
                key={`ring-${rIdx}`}
                object={
                  new THREE.LineLoop(
                    lineGeom,
                    new THREE.LineBasicMaterial({
                      color: boundaryColor,
                      linewidth: isSelected ? 2 : 1,
                      transparent: true,
                      opacity: isSelected ? 0.95 : isHovered ? 0.85 : 0.45,
                    })
                  )
                }
              />
            );
          })}

        {/* District Labels */}
        {(showLabels || isHovered || isSelected) && (
          <Html
            position={[centerPos.x, centerPos.y, centerPos.z]}
            center
            distanceFactor={22}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              className={`max-w-[110px] truncate px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider transition-all duration-200 ${
                isSelected
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-400/60 shadow-[0_0_8px_rgba(46,230,166,0.35)]'
                  : isHovered
                  ? 'bg-sky-950/90 text-sky-200 border border-sky-400/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400/80 border border-slate-700/30'
              }`}
            >
              {properties.district}
            </div>
          </Html>
        )}
      </group>
    );
  }
);

export const DistrictLayer: React.FC<DistrictLayerProps> = ({
  districts,
  selectedEntity,
  hoveredEntity,
  showBoundaries,
  showLabels,
  is3DExtruded,
  onSelectDistrict,
  onHoverDistrict,
}) => {
  return (
    <group name="DistrictLayer">
      {districts.map((feature) => {
        const dName = feature.properties.district;
        const isSelected =
          selectedEntity?.type === 'district' &&
          selectedEntity.data.district === dName;
        const isHovered =
          hoveredEntity?.type === 'district' &&
          hoveredEntity.data.district === dName;

        return (
          <SingleDistrictMesh
            key={feature.properties.dt_code || dName}
            feature={feature}
            isSelected={isSelected}
            isHovered={isHovered}
            showBoundaries={showBoundaries}
            showLabels={showLabels}
            is3DExtruded={is3DExtruded}
            onSelect={() => onSelectDistrict(feature.properties)}
            onHover={(h) => onHoverDistrict(h ? feature.properties : null)}
          />
        );
      })}
    </group>
  );
};
